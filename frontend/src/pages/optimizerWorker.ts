import {optimizeMonsterRunes, resetOptimizationStop,} from "../services/optimizerEngine";
import {prepareRunes} from "../services/runePreparation";
import {type MonsterBuildPool, optimizeTeamBuilds,} from "../services/teamBuildOptimizer";
import type {Monster} from "../types/Monster";
import type {MonsterConfig} from "../types/MonsterConfig";
import type {SwexRune} from "../types/Rune";

interface OptimizeWorkerRequest {
    type?: "optimize";
    monsters: Monster[];
    configs: Record<number, MonsterConfig>;
    playOrder: number[];
    runePriorityOrder: number[];
    allRunes: SwexRune[];
}

interface MonsterProgress {
    explored: number;
    pruned: number;
    total: number;
    branches: number;
    elapsedMs: number;
}

interface WorkerMonsterResult extends MonsterBuildPool {
    totalBuilds: number;
    statistics: ReturnType<typeof optimizeMonsterRunes>["statistics"];
}

self.onmessage = (
    event: MessageEvent<OptimizeWorkerRequest>
): void => {
    const {
        monsters = [],
        configs = {},
        playOrder = [],
        runePriorityOrder = [],
        allRunes = [],
    } = event.data;

    const preparationStart = performance.now();
    const preparedRunes = prepareRunes(allRunes);
    const preparationElapsedMs =
        performance.now() - preparationStart;

    self.postMessage({
        type: "prepared",
        rawRuneCount: allRunes.length,
        preparedRuneCount: preparedRunes.length,
        preparationElapsedMs,
    });

    const monsterById = new Map(
        monsters.map((monster) => [monster.id, monster])
    );

    const priorityIds = new Set(runePriorityOrder);

    const monstersByRunePriority = [
        ...runePriorityOrder
            .map((monsterId) => monsterById.get(monsterId))
            .filter((monster): monster is Monster => monster !== undefined),
        ...monsters.filter((monster) => !priorityIds.has(monster.id)),
    ];

    const results: WorkerMonsterResult[] = [];

    let completedExplored = 0;
    let completedPruned = 0;
    let completedBranches = 0;
    let completedTotal = 0;
    let lastProgressSentAt = 0;

    for (
        let monsterIndex = 0;
        monsterIndex < monstersByRunePriority.length;
        monsterIndex++
    ) {
        const monster = monstersByRunePriority[monsterIndex];
        const config = configs[monster.id];

        if (!config) {
            self.postMessage({
                type: "monster-error",
                monsterId: monster.id,
                monsterName: monster.name,
                error: "Configuration du monstre introuvable.",
            });
            continue;
        }

        resetOptimizationStop();

        let currentProgress: MonsterProgress = {
            explored: 0,
            pruned: 0,
            total: 0,
            branches: 0,
            elapsedMs: 0,
        };

        try {
            const output = optimizeMonsterRunes(
                monster,
                config,
                preparedRunes,
                (progress) => {
                    currentProgress = progress;
                    const now = performance.now();

                    if (now - lastProgressSentAt < 250) {
                        return;
                    }

                    lastProgressSentAt = now;

                    self.postMessage({
                        type: "progress",
                        phase: "monster",
                        currentMonsterId: monster.id,
                        currentMonsterName: monster.name,
                        monsterIndex,
                        monsterCount: monstersByRunePriority.length,
                        explored:
                            completedExplored + progress.explored,
                        pruned:
                            completedPruned + progress.pruned,
                        branches:
                            completedBranches + progress.branches,
                        total:
                            completedTotal + progress.total,
                        currentMonsterExplored: progress.explored,
                        currentMonsterPruned: progress.pruned,
                        currentMonsterBranches: progress.branches,
                        currentMonsterTotal: progress.total,
                        currentMonsterElapsedMs: progress.elapsedMs,
                    });
                }
            );

            completedExplored += output.statistics.validBuilds;
            completedPruned += output.statistics.pruned;
            completedBranches += output.statistics.branches;
            completedTotal += currentProgress.total;

            results.push({
                monsterId: monster.id,
                monsterName: monster.name,
                results: output.results,
                totalBuilds: output.totalBuilds,
                statistics: output.statistics,
            });

            self.postMessage({
                type: "monster-result",
                monsterId: monster.id,
                monsterName: monster.name,
                monsterIndex,
                monsterCount: monstersByRunePriority.length,
                resultCount: output.results.length,
                totalBuilds: output.totalBuilds,
                statistics: output.statistics,
            });
        } catch (error) {
            self.postMessage({
                type: "monster-error",
                monsterId: monster.id,
                monsterName: monster.name,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });
        }
    }

    const allMonstersCompleted =
        results.length === monstersByRunePriority.length;
    const everyMonsterHasBuilds = results.every(
        (result) => result.results.length > 0
    );

    const teamStart = performance.now();

    const teamOutput =
        allMonstersCompleted && everyMonsterHasBuilds
            ? optimizeTeamBuilds(
                monsters,
                results,
                {
                    playOrder,
                    runePriorityOrder,
                    resultLimit: 100,
                    maxBranches: 5_000_000,
                    maxDurationMs: 30_000,
                }
            )
            : {
                results: [],
                statistics: {
                    explored: 0,
                    prunedRuneConflict: 0,
                    prunedSpeedOrder: 0,
                    prunedScore: 0,
                    elapsedMs: 0,
                    stoppedByBranchLimit: false,
                    stoppedByDurationLimit: false,
                    approximate: false,
                },
            };

    const teamElapsedMs = performance.now() - teamStart;

    self.postMessage({
        type: "team-result",
        results: teamOutput.results,
        statistics: teamOutput.statistics,
    });

    const totalElapsedMs =
        preparationElapsedMs +
        results.reduce(
            (sum, result) =>
                sum + result.statistics.elapsedMs,
            0
        ) +
        teamElapsedMs;

    self.postMessage({
        type: "result",
        results,
        teamResults: teamOutput.results,
        teamStatistics: teamOutput.statistics,
        summary: {
            monsterCount: monstersByRunePriority.length,
            completedMonsterCount: results.length,
            rawRuneCount: allRunes.length,
            preparedRuneCount: preparedRunes.length,
            explored: completedExplored,
            pruned: completedPruned,
            branches: completedBranches,
            preparationElapsedMs,
            teamElapsedMs,
            totalElapsedMs,
            approximate:
                results.some(
                    (result) => result.statistics.approximate
                ) || teamOutput.statistics.approximate,
        },
    });
};

export {};
