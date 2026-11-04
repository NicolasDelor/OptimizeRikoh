export type OptimizableStat =
    | "hp"
    | "atk"
    | "def"
    | "spd"
    | "cr"
    | "cd"
    | "acc"
    | "res"
    | "ehp"
    | "efficiency"
    | "damage";

export interface StatConstraints {
    hpMin?: number;
    hpMax?: number;

    atkMin?: number;
    atkMax?: number;

    defMin?: number;
    defMax?: number;

    spdMin?: number;
    spdMax?: number;

    crMin?: number;
    crMax?: number;

    cdMin?: number;
    cdMax?: number;

    accMin?: number;
    accMax?: number;

    resMin?: number;
    resMax?: number;

    ehpMin?: number;
    ehpMax?: number;

    efficiencyMin?: number;
    efficiencyMax?: number;
}

export interface MonsterConfig {
    monsterId: number;

    stats: StatConstraints;

    requiredSet1: string[];
    requiredSet2: string[];
    requiredSet3: string[];

    forbiddenSets: string[];

    slot2MainStats: string[];
    slot4MainStats: string[];
    slot6MainStats: string[];

    focus: OptimizableStat[];

    searchDepth: number;
    resultLimit: number;
    maxBranches: number;
    maxDurationMs: number;
}
