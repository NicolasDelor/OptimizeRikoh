import type {Monster} from "../types/Monster";
import type {OptimizationResult} from "../types/OptimizationResult";

export interface MonsterBuildPool {
    monsterId: number;
    monsterName: string;
    results: OptimizationResult[];
}

export interface TeamBuildSelection {
    monsterId: number;
    monsterName: string;
    build: OptimizationResult;
}

export interface TeamOptimizationResult {
    selections: TeamBuildSelection[];
    score: number;
}

export interface TeamOptimizationStatistics {
    explored: number;
    prunedRuneConflict: number;
    prunedSpeedOrder: number;
    prunedScore: number;
    elapsedMs: number;
    stoppedByBranchLimit: boolean;
    stoppedByDurationLimit: boolean;
    approximate: boolean;
}

export interface TeamOptimizationOutput {
    results: TeamOptimizationResult[];
    statistics: TeamOptimizationStatistics;
}

export interface TeamOptimizationOptions {
    playOrder: number[];
    runePriorityOrder: number[];
    resultLimit?: number;
    maxBranches?: number;
    maxDurationMs?: number;
}

interface OrderedPool extends MonsterBuildPool {
    technicalOrder: number;
}

const DEFAULT_RESULT_LIMIT = 100;
const DEFAULT_MAX_BRANCHES = 5_000_000;
const DEFAULT_MAX_DURATION_MS = 30_000;

function createOrderMap(order: readonly number[]): Map<number, number> {
    return new Map(
        order.map((monsterId, index) => [monsterId, index])
    );
}

function getSelectionByMonsterId(
    result: TeamOptimizationResult
): Map<number, TeamBuildSelection> {
    return new Map(
        result.selections.map((selection) => [
            selection.monsterId,
            selection,
        ])
    );
}

function compareRuneIds(
    firstBuild: OptimizationResult,
    secondBuild: OptimizationResult
): number {
    for (let index = 0; index < 6; index++) {
        const firstRuneId = firstBuild.runeIds[index] ?? 0;
        const secondRuneId = secondBuild.runeIds[index] ?? 0;

        if (firstRuneId !== secondRuneId) {
            return firstRuneId - secondRuneId;
        }
    }

    return 0;
}

function compareTeamResults(
    first: TeamOptimizationResult,
    second: TeamOptimizationResult,
    runePriorityOrder: readonly number[]
): number {
    const firstSelections = getSelectionByMonsterId(first);
    const secondSelections = getSelectionByMonsterId(second);

    for (const monsterId of runePriorityOrder) {
        const firstSelection = firstSelections.get(monsterId);
        const secondSelection = secondSelections.get(monsterId);

        if (!firstSelection || !secondSelection) {
            continue;
        }

        if (firstSelection.build.score !== secondSelection.build.score) {
            return secondSelection.build.score - firstSelection.build.score;
        }

        const runeComparison = compareRuneIds(
            firstSelection.build,
            secondSelection.build
        );

        if (runeComparison !== 0) {
            return runeComparison;
        }
    }

    if (first.score !== second.score) {
        return second.score - first.score;
    }

    return 0;
}

function insertTeamResult(
    results: TeamOptimizationResult[],
    result: TeamOptimizationResult,
    resultLimit: number,
    runePriorityOrder: readonly number[]
): void {
    let start = 0;
    let end = results.length;

    while (start < end) {
        const middle = Math.floor((start + end) / 2);

        if (
            compareTeamResults(
                result,
                results[middle],
                runePriorityOrder
            ) < 0
        ) {
            end = middle;
        } else {
            start = middle + 1;
        }
    }

    results.splice(start, 0, result);

    if (results.length > resultLimit) {
        results.pop();
    }
}

function hasRuneConflict(
    build: OptimizationResult,
    usedRuneIds: ReadonlySet<number>
): boolean {
    return build.runeIds.some((runeId) => usedRuneIds.has(runeId));
}

function getOrderedPools(
    monsters: readonly Monster[],
    buildPools: readonly MonsterBuildPool[],
    runePriorityOrder: readonly number[]
): OrderedPool[] {
    const monsterNames = new Map(
        monsters.map((monster) => [monster.id, monster.name])
    );
    const runePriorityMap = createOrderMap(runePriorityOrder);

    return buildPools
        .map((pool, technicalOrder) => ({
            monsterId: pool.monsterId,
            monsterName:
                pool.monsterName ||
                monsterNames.get(pool.monsterId) ||
                String(pool.monsterId),
            results: [...pool.results].sort(
                (first, second) =>
                    second.score - first.score ||
                    compareRuneIds(first, second)
            ),
            technicalOrder,
        }))
        .sort((first, second) => {
            if (first.results.length !== second.results.length) {
                return first.results.length - second.results.length;
            }

            const firstPriority =
                runePriorityMap.get(first.monsterId) ??
                Number.MAX_SAFE_INTEGER;
            const secondPriority =
                runePriorityMap.get(second.monsterId) ??
                Number.MAX_SAFE_INTEGER;

            if (firstPriority !== secondPriority) {
                return firstPriority - secondPriority;
            }

            return first.technicalOrder - second.technicalOrder;
        });
}

function validateFinalSpeedOrder(
    selections: readonly TeamBuildSelection[],
    playOrder: readonly number[]
): boolean {
    const selectionsByMonsterId = new Map(
        selections.map((selection) => [
            selection.monsterId,
            selection,
        ])
    );

    const orderedSelections = playOrder
        .map((monsterId) => selectionsByMonsterId.get(monsterId))
        .filter(
            (selection): selection is TeamBuildSelection =>
                selection !== undefined
        );

    for (let index = 1; index < orderedSelections.length; index++) {
        if (
            orderedSelections[index - 1].build.spd <
            orderedSelections[index].build.spd
        ) {
            return false;
        }
    }

    return true;
}

function sortSelectionsByPlayOrder(
    selections: TeamBuildSelection[],
    playOrder: readonly number[]
): void {
    const playOrderMap = createOrderMap(playOrder);

    selections.sort((first, second) => {
        const firstOrder =
            playOrderMap.get(first.monsterId) ??
            Number.MAX_SAFE_INTEGER;
        const secondOrder =
            playOrderMap.get(second.monsterId) ??
            Number.MAX_SAFE_INTEGER;

        return firstOrder - secondOrder;
    });
}

export function optimizeTeamBuilds(
    monsters: readonly Monster[],
    buildPools: readonly MonsterBuildPool[],
    options: TeamOptimizationOptions
): TeamOptimizationOutput {
    const startTime = performance.now();
    const resultLimit = Math.max(
        1,
        Math.floor(options.resultLimit ?? DEFAULT_RESULT_LIMIT)
    );
    const maxBranches = Math.max(
        1,
        Math.floor(options.maxBranches ?? DEFAULT_MAX_BRANCHES)
    );
    const maxDurationMs = Math.max(
        100,
        Math.floor(options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS)
    );

    const statistics: TeamOptimizationStatistics = {
        explored: 0,
        prunedRuneConflict: 0,
        prunedSpeedOrder: 0,
        prunedScore: 0,
        elapsedMs: 0,
        stoppedByBranchLimit: false,
        stoppedByDurationLimit: false,
        approximate: false,
    };

    const orderedPools = getOrderedPools(
        monsters,
        buildPools,
        options.runePriorityOrder
    );

    if (
        orderedPools.length === 0 ||
        orderedPools.some((pool) => pool.results.length === 0)
    ) {
        statistics.elapsedMs = performance.now() - startTime;
        return {results: [], statistics};
    }

    const results: TeamOptimizationResult[] = [];
    const selections: TeamBuildSelection[] = [];
    const usedRuneIds = new Set<number>();

    function mustStop(): boolean {
        if (statistics.explored >= maxBranches) {
            statistics.stoppedByBranchLimit = true;
            statistics.approximate = true;
            return true;
        }

        if (performance.now() - startTime >= maxDurationMs) {
            statistics.stoppedByDurationLimit = true;
            statistics.approximate = true;
            return true;
        }

        return false;
    }

    function explore(poolIndex: number, currentScore: number): void {
        if (mustStop()) {
            return;
        }

        if (poolIndex >= orderedPools.length) {
            if (
                !validateFinalSpeedOrder(
                    selections,
                    options.playOrder
                )
            ) {
                statistics.prunedSpeedOrder++;
                return;
            }

            insertTeamResult(
                results,
                {
                    selections: selections.map((selection) => ({
                        ...selection,
                    })),
                    score: currentScore,
                },
                resultLimit,
                options.runePriorityOrder
            );

            return;
        }

        const pool = orderedPools[poolIndex];

        for (const build of pool.results) {
            statistics.explored++;

            if (mustStop()) {
                return;
            }

            if (hasRuneConflict(build, usedRuneIds)) {
                statistics.prunedRuneConflict++;
                continue;
            }

            for (const runeId of build.runeIds) {
                usedRuneIds.add(runeId);
            }

            selections.push({
                monsterId: pool.monsterId,
                monsterName: pool.monsterName,
                build,
            });

            explore(poolIndex + 1, currentScore + build.score);

            selections.pop();

            for (const runeId of build.runeIds) {
                usedRuneIds.delete(runeId);
            }
        }
    }

    explore(0, 0);

    statistics.elapsedMs = performance.now() - startTime;

    for (const result of results) {
        sortSelectionsByPlayOrder(
            result.selections,
            options.playOrder
        );
    }

    return {results, statistics};
}
