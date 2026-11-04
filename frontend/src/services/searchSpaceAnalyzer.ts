import type {Monster} from "../types/Monster";
import type {MonsterConfig} from "../types/MonsterConfig";
import type {PreparedRune, RuneStats} from "../types/Rune";
import {generateSetPatterns, type SetPattern,} from "./setPatternGenerator";

export interface SearchSlot {
    slot: number;
    runes: PreparedRune[];
}

export interface SearchSpaceMaximums {
    hpFlat: number;
    hpPercent: number;

    atkFlat: number;
    atkPercent: number;

    defFlat: number;
    defPercent: number;

    spd: number;
    cr: number;
    cd: number;
    acc: number;
    res: number;
}

export interface SearchSpaceAnalysis {
    possible: boolean;

    estimatedBuilds: number;
    estimatedBuildsCapped: boolean;

    maximumStats: {
        hp: number;
        atk: number;
        def: number;
        spd: number;
        cr: number;
        cd: number;
        acc: number;
        res: number;
        ehp: number;
    };

    maximumRuneStats: SearchSpaceMaximums;

    validSetPatterns: SetPattern[];

    impossibleReasons: string[];
}

const MAX_ESTIMATED_BUILDS = Number.MAX_SAFE_INTEGER;

function createEmptyMaximums(): SearchSpaceMaximums {
    return {
        hpFlat: 0,
        hpPercent: 0,

        atkFlat: 0,
        atkPercent: 0,

        defFlat: 0,
        defPercent: 0,

        spd: 0,
        cr: 0,
        cd: 0,
        acc: 0,
        res: 0,
    };
}

function getMaximumRuneStat(
    runes: readonly PreparedRune[],
    selector: (stats: RuneStats) => number
): number {
    let maximum = 0;

    for (const rune of runes) {
        maximum = Math.max(maximum, selector(rune.stats));
    }

    return maximum;
}

function calculateEstimatedBuilds(
    slotRunes: readonly SearchSlot[]
): {
    estimatedBuilds: number;
    estimatedBuildsCapped: boolean;
} {
    let estimatedBuilds = 1;

    for (const slot of slotRunes) {
        if (slot.runes.length === 0) {
            return {
                estimatedBuilds: 0,
                estimatedBuildsCapped: false,
            };
        }

        if (
            estimatedBuilds >
            Math.floor(MAX_ESTIMATED_BUILDS / slot.runes.length)
        ) {
            return {
                estimatedBuilds: MAX_ESTIMATED_BUILDS,
                estimatedBuildsCapped: true,
            };
        }

        estimatedBuilds *= slot.runes.length;
    }

    return {
        estimatedBuilds,
        estimatedBuildsCapped: false,
    };
}

function collectMaximumRuneStats(
    slotRunes: readonly SearchSlot[]
): SearchSpaceMaximums {
    const maximums = createEmptyMaximums();

    for (const slot of slotRunes) {
        maximums.hpFlat += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.hpFlat
        );

        maximums.hpPercent += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.hpPercent
        );

        maximums.atkFlat += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.atkFlat
        );

        maximums.atkPercent += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.atkPercent
        );

        maximums.defFlat += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.defFlat
        );

        maximums.defPercent += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.defPercent
        );

        maximums.spd += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.spd
        );

        maximums.cr += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.cr
        );

        maximums.cd += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.cd
        );

        maximums.acc += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.acc
        );

        maximums.res += getMaximumRuneStat(
            slot.runes,
            (stats) => stats.res
        );
    }

    return maximums;
}

function getMaximumPossibleSetBonuses(
    monster: Monster
): {
    hp: number;
    atk: number;
    def: number;
    spd: number;
    cr: number;
    cd: number;
    acc: number;
    res: number;
} {
    return {
        hp: Math.round(monster.baseHp * 0.45),
        atk: Math.round(monster.baseAtk * 0.35),
        def: Math.round(monster.baseDef * 0.45),
        spd: Math.round(monster.baseSpd * 0.25),
        cr: 36,
        cd: 40,
        acc: 60,
        res: 60,
    };
}

function patternHasAvailablePieces(
    pattern: SetPattern,
    slotRunes: readonly SearchSlot[]
): boolean {
    const availablePiecesBySet: Record<string, number> = {};

    for (const slot of slotRunes) {
        const setsAvailableInSlot = new Set(
            slot.runes.map((rune) => rune.setName)
        );

        for (const setName of setsAvailableInSlot) {
            availablePiecesBySet[setName] =
                (availablePiecesBySet[setName] ?? 0) + 1;
        }
    }

    for (const [setName, requiredPieces] of Object.entries(
        pattern.requiredPieces
    )) {
        if (
            (availablePiecesBySet[setName] ?? 0) <
            (requiredPieces ?? 0)
        ) {
            return false;
        }
    }

    if (
        (availablePiecesBySet.Intangible ?? 0) <
        pattern.intangiblePieces
    ) {
        return false;
    }

    return true;
}

function hasMinimumFailure(
    value: number,
    minimum: number | undefined
): boolean {
    return minimum !== undefined && value < minimum;
}

export function analyzeSearchSpace(
    monster: Monster,
    config: MonsterConfig,
    slotRunes: SearchSlot[]
): SearchSpaceAnalysis {
    const impossibleReasons: string[] = [];

    const slotByNumber = new Map(
        slotRunes.map((slot) => [slot.slot, slot])
    );

    for (let slotNumber = 1; slotNumber <= 6; slotNumber++) {
        const slot = slotByNumber.get(slotNumber);

        if (!slot || slot.runes.length === 0) {
            impossibleReasons.push(
                `Aucune rune candidate pour le slot ${slotNumber}.`
            );
        }
    }

    const {
        estimatedBuilds,
        estimatedBuildsCapped,
    } = calculateEstimatedBuilds(slotRunes);

    const maximumRuneStats = collectMaximumRuneStats(slotRunes);
    const maximumSetBonuses =
        getMaximumPossibleSetBonuses(monster);

    const maximumStats = {
        hp: Math.round(
            monster.hp +
            maximumRuneStats.hpFlat +
            (monster.baseHp * maximumRuneStats.hpPercent) / 100 +
            maximumSetBonuses.hp
        ),

        atk: Math.round(
            monster.atk +
            maximumRuneStats.atkFlat +
            (monster.baseAtk * maximumRuneStats.atkPercent) / 100 +
            maximumSetBonuses.atk
        ),

        def: Math.round(
            monster.def +
            maximumRuneStats.defFlat +
            (monster.baseDef * maximumRuneStats.defPercent) / 100 +
            maximumSetBonuses.def
        ),

        spd: Math.round(
            monster.spd +
            maximumRuneStats.spd +
            maximumSetBonuses.spd
        ),

        cr: Math.round(
            monster.cr +
            maximumRuneStats.cr +
            maximumSetBonuses.cr
        ),

        cd: Math.round(
            monster.cd +
            maximumRuneStats.cd +
            maximumSetBonuses.cd
        ),

        acc: Math.round(
            monster.acc +
            maximumRuneStats.acc +
            maximumSetBonuses.acc
        ),

        res: Math.round(
            monster.res +
            maximumRuneStats.res +
            maximumSetBonuses.res
        ),

        ehp: 0,
    };

    maximumStats.ehp = Math.round(
        (maximumStats.hp * (1140 + maximumStats.def)) / 1000
    );

    const constraints = config.stats;

    if (hasMinimumFailure(maximumStats.hp, constraints.hpMin)) {
        impossibleReasons.push(
            `HP minimum impossible : maximum optimiste ${maximumStats.hp}.`
        );
    }

    if (hasMinimumFailure(maximumStats.atk, constraints.atkMin)) {
        impossibleReasons.push(
            `ATK minimum impossible : maximum optimiste ${maximumStats.atk}.`
        );
    }

    if (hasMinimumFailure(maximumStats.def, constraints.defMin)) {
        impossibleReasons.push(
            `DEF minimum impossible : maximum optimiste ${maximumStats.def}.`
        );
    }

    if (hasMinimumFailure(maximumStats.spd, constraints.spdMin)) {
        impossibleReasons.push(
            `SPD minimum impossible : maximum optimiste ${maximumStats.spd}.`
        );
    }

    if (hasMinimumFailure(maximumStats.cr, constraints.crMin)) {
        impossibleReasons.push(
            `CR minimum impossible : maximum optimiste ${maximumStats.cr}.`
        );
    }

    if (hasMinimumFailure(maximumStats.cd, constraints.cdMin)) {
        impossibleReasons.push(
            `CD minimum impossible : maximum optimiste ${maximumStats.cd}.`
        );
    }

    if (hasMinimumFailure(maximumStats.acc, constraints.accMin)) {
        impossibleReasons.push(
            `ACC minimum impossible : maximum optimiste ${maximumStats.acc}.`
        );
    }

    if (hasMinimumFailure(maximumStats.res, constraints.resMin)) {
        impossibleReasons.push(
            `RES minimum impossible : maximum optimiste ${maximumStats.res}.`
        );
    }

    if (hasMinimumFailure(maximumStats.ehp, constraints.ehpMin)) {
        impossibleReasons.push(
            `EHP minimum impossible : maximum optimiste ${maximumStats.ehp}.`
        );
    }

    const requiredSets = [
        ...(config.requiredSet1 ?? []),
        ...(config.requiredSet2 ?? []),
        ...(config.requiredSet3 ?? []),
    ].filter(Boolean);

    const generatedSetPatterns = generateSetPatterns(requiredSets);

    const validSetPatterns = generatedSetPatterns.filter((pattern) =>
        patternHasAvailablePieces(pattern, slotRunes)
    );

    if (
        requiredSets.length > 0 &&
        validSetPatterns.length === 0
    ) {
        impossibleReasons.push(
            "Aucune combinaison de runes disponible ne peut compléter les sets requis."
        );
    }

    return {
        possible: impossibleReasons.length === 0,

        estimatedBuilds,
        estimatedBuildsCapped,

        maximumStats,
        maximumRuneStats,

        validSetPatterns,
        impossibleReasons,
    };
}