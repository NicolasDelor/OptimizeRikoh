export interface MonsterConfig {
  monsterId: number;

  stats: {
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
  };

  requiredSets: string[];
  forbiddenSets: string[];

  speedOrder?: number;

  focus?: string;

  ehpMin?: number;
  efficiencyMin?: number;
}