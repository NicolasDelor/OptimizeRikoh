import type { Monster } from "../types/Monster";
import type { MonsterConfig, OptimizableStat } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import type { PreparedRune, RuneStats } from "../types/Rune";
import { calculateBuildStats, type BuildCalculation } from "./statCalculator";
import {
  findValidActiveSets,
  getRequiredSets,
  passesSlotFilters,
  passesStatFilters,
} from "./optimizerFilters";
import {
  analyzeSearchSpace,
  type SearchSlot,
  type SearchSpaceMaximums,
} from "./searchSpaceAnalyzer";
import { TopKResults } from "./topKResults";

export interface OptimizationProgress {
  explored: number;
  pruned: number;
  total: number;
  branches: number;
  elapsedMs: number;
}

export interface OptimizationStatistics {
  branches: number;
  terminalBuilds: number;
  validBuilds: number;
  pruned: number;
  prunedSets: number;
  prunedMinimums: number;
  prunedMaximums: number;
  prunedLimits: number;
  elapsedMs: number;
  stoppedByResultLimit: boolean;
  stoppedByBranchLimit: boolean;
  stoppedByDurationLimit: boolean;
  stoppedByRequest: boolean;
  approximate: boolean;
}

export interface MonsterOptimizationOutput {
  results: OptimizationResult[];
  totalBuilds: number;
  statistics: OptimizationStatistics;
}

type PartialBuildStats = RuneStats;
type RemainingMaximums = SearchSpaceMaximums;

interface OptimizationLimits {
  resultLimit: number;
  searchDepth: number;
  maxBranches: number;
  maxDurationMs: number;
}

let stopRequested = false;

export function resetOptimizationStop(): void {
  stopRequested = false;
}

function createEmptyPartialStats(): PartialBuildStats {
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

function createEmptyMaximums(): RemainingMaximums {
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

function addRuneStats(
  current: PartialBuildStats,
  rune: PreparedRune
): PartialBuildStats {
  return {
    hpFlat: current.hpFlat + rune.stats.hpFlat,
    hpPercent: current.hpPercent + rune.stats.hpPercent,
    atkFlat: current.atkFlat + rune.stats.atkFlat,
    atkPercent: current.atkPercent + rune.stats.atkPercent,
    defFlat: current.defFlat + rune.stats.defFlat,
    defPercent: current.defPercent + rune.stats.defPercent,
    spd: current.spd + rune.stats.spd,
    cr: current.cr + rune.stats.cr,
    cd: current.cd + rune.stats.cd,
    acc: current.acc + rune.stats.acc,
    res: current.res + rune.stats.res,
  };
}

function getRequiredSetNames(config: MonsterConfig): ReadonlySet<string> {
  return new Set(getRequiredSets(config));
}

function getFocusList(config: MonsterConfig): OptimizableStat[] {
  return config.focus?.length > 0 ? config.focus : ["spd"];
}

function getRuneFocusValue(
  rune: PreparedRune,
  focus: OptimizableStat,
  monster: Monster
): number {
  switch (focus) {
    case "hp":
      return rune.stats.hpFlat + (monster.baseHp * rune.stats.hpPercent) / 100;
    case "atk":
      return (
        rune.stats.atkFlat + (monster.baseAtk * rune.stats.atkPercent) / 100
      );
    case "def":
      return (
        rune.stats.defFlat + (monster.baseDef * rune.stats.defPercent) / 100
      );
    case "spd":
      return rune.stats.spd;
    case "cr":
      return rune.stats.cr;
    case "cd":
      return rune.stats.cd;
    case "acc":
      return rune.stats.acc;
    case "res":
      return rune.stats.res;
    case "ehp":
      return (
        rune.stats.hpFlat +
        (monster.baseHp * rune.stats.hpPercent) / 100 +
        rune.stats.defFlat +
        (monster.baseDef * rune.stats.defPercent) / 100
      );
    case "damage":
      return (
        rune.stats.atkFlat +
        (monster.baseAtk * rune.stats.atkPercent) / 100 +
        rune.stats.cr +
        rune.stats.cd
      );
    case "efficiency":
      return (
        rune.stats.hpPercent +
        rune.stats.atkPercent +
        rune.stats.defPercent +
        rune.stats.spd * 2 +
        rune.stats.cr * 1.5 +
        rune.stats.cd +
        rune.stats.acc +
        rune.stats.res
      );
    default:
      return 0;
  }
}

function compareRunes(
  first: PreparedRune,
  second: PreparedRune,
  monster: Monster,
  focus: readonly OptimizableStat[],
  requiredSetNames: ReadonlySet<string>
): number {
  const firstIsRequired =
    requiredSetNames.has(first.setName) || first.setName === "Intangible";
  const secondIsRequired =
    requiredSetNames.has(second.setName) || second.setName === "Intangible";

  if (firstIsRequired !== secondIsRequired) {
    return firstIsRequired ? -1 : 1;
  }

  for (const focusStat of focus) {
    const difference =
      getRuneFocusValue(second, focusStat, monster) -
      getRuneFocusValue(first, focusStat, monster);

    if (difference !== 0) {
      return difference;
    }
  }

  return first.id - second.id;
}

function applyMainStatFilters(
  runes: PreparedRune[],
  config: MonsterConfig
): PreparedRune[] {
  return runes.filter((rune) => {
    const acceptedMainStats =
      rune.slot === 2
        ? config.slot2MainStats
        : rune.slot === 4
          ? config.slot4MainStats
          : rune.slot === 6
            ? config.slot6MainStats
            : [];

    return (
      acceptedMainStats.length === 0 ||
      acceptedMainStats.includes(rune.mainStatName)
    );
  });
}

function createSlotRunes(
  monster: Monster,
  config: MonsterConfig,
  availableRunes: PreparedRune[]
): {
  slotRunes: SearchSlot[];
  depthWasApplied: boolean;
} {
  const focus = getFocusList(config);
  const requiredSetNames = getRequiredSetNames(config);
  const filteredRunes = applyMainStatFilters(availableRunes, config);
  const searchDepth = Math.max(1, Math.floor(config.searchDepth ?? 5000));

  let depthWasApplied = false;
  const slotRunes: SearchSlot[] = [];

  for (let slot = 1; slot <= 6; slot++) {
    let runes = filteredRunes
      .filter((rune) => rune.slot === slot)
      .sort((first, second) =>
        compareRunes(first, second, monster, focus, requiredSetNames)
      );

    if (runes.length > searchDepth) {
      runes = runes.slice(0, searchDepth);
      depthWasApplied = true;
    }

    slotRunes.push({ slot, runes });
  }

  return { slotRunes, depthWasApplied };
}

function getMaximumForSlot(
  runes: readonly PreparedRune[],
  selector: (stats: RuneStats) => number
): number {
  let maximum = 0;

  for (const rune of runes) {
    maximum = Math.max(maximum, selector(rune.stats));
  }

  return maximum;
}

function buildRemainingMaximums(
  slotRunes: readonly SearchSlot[]
): RemainingMaximums[] {
  const remainingMaximums = new Array<RemainingMaximums>(slotRunes.length + 1);

  let runningMaximums = createEmptyMaximums();
  remainingMaximums[slotRunes.length] = createEmptyMaximums();

  for (let index = slotRunes.length - 1; index >= 0; index--) {
    const runes = slotRunes[index].runes;

    runningMaximums = {
      hpFlat:
        runningMaximums.hpFlat +
        getMaximumForSlot(runes, (stats) => stats.hpFlat),
      hpPercent:
        runningMaximums.hpPercent +
        getMaximumForSlot(runes, (stats) => stats.hpPercent),
      atkFlat:
        runningMaximums.atkFlat +
        getMaximumForSlot(runes, (stats) => stats.atkFlat),
      atkPercent:
        runningMaximums.atkPercent +
        getMaximumForSlot(runes, (stats) => stats.atkPercent),
      defFlat:
        runningMaximums.defFlat +
        getMaximumForSlot(runes, (stats) => stats.defFlat),
      defPercent:
        runningMaximums.defPercent +
        getMaximumForSlot(runes, (stats) => stats.defPercent),
      spd: runningMaximums.spd + getMaximumForSlot(runes, (stats) => stats.spd),
      cr: runningMaximums.cr + getMaximumForSlot(runes, (stats) => stats.cr),
      cd: runningMaximums.cd + getMaximumForSlot(runes, (stats) => stats.cd),
      acc: runningMaximums.acc + getMaximumForSlot(runes, (stats) => stats.acc),
      res: runningMaximums.res + getMaximumForSlot(runes, (stats) => stats.res),
    };

    remainingMaximums[index] = { ...runningMaximums };
  }

  return remainingMaximums;
}

function getOptimisticStats(
  monster: Monster,
  partialStats: PartialBuildStats,
  remaining: RemainingMaximums
) {
  const hp =
    monster.hp +
    partialStats.hpFlat +
    remaining.hpFlat +
    (monster.baseHp * (partialStats.hpPercent + remaining.hpPercent + 45)) /
      100;

  const atk =
    monster.atk +
    partialStats.atkFlat +
    remaining.atkFlat +
    (monster.baseAtk * (partialStats.atkPercent + remaining.atkPercent + 35)) /
      100;

  const def =
    monster.def +
    partialStats.defFlat +
    remaining.defFlat +
    (monster.baseDef * (partialStats.defPercent + remaining.defPercent + 45)) /
      100;

  const spd =
    monster.spd + partialStats.spd + remaining.spd + monster.baseSpd * 0.25;

  const cr = monster.cr + partialStats.cr + remaining.cr + 36;
  const cd = monster.cd + partialStats.cd + remaining.cd + 40;
  const acc = monster.acc + partialStats.acc + remaining.acc + 60;
  const res = monster.res + partialStats.res + remaining.res + 60;
  const ehp = (hp * (1140 + def)) / 1000;
  const effectiveCr = Math.min(100, Math.max(0, cr));
  const damage = atk * (1 + (effectiveCr / 100) * (Math.max(0, cd) / 100));

  const efficiency =
    partialStats.hpPercent +
    remaining.hpPercent +
    partialStats.atkPercent +
    remaining.atkPercent +
    partialStats.defPercent +
    remaining.defPercent +
    (partialStats.spd + remaining.spd) * 2 +
    (partialStats.cr + remaining.cr) * 1.5 +
    partialStats.cd +
    remaining.cd +
    partialStats.acc +
    remaining.acc +
    partialStats.res +
    remaining.res;

  return { hp, atk, def, spd, cr, cd, acc, res, ehp, damage, efficiency };
}

function canStillReachMinimums(
  monster: Monster,
  partialStats: PartialBuildStats,
  remaining: RemainingMaximums,
  config: MonsterConfig
): boolean {
  const optimistic = getOptimisticStats(monster, partialStats, remaining);
  const constraints = config.stats;

  return !(
    (constraints.hpMin !== undefined && optimistic.hp < constraints.hpMin) ||
    (constraints.atkMin !== undefined && optimistic.atk < constraints.atkMin) ||
    (constraints.defMin !== undefined && optimistic.def < constraints.defMin) ||
    (constraints.spdMin !== undefined && optimistic.spd < constraints.spdMin) ||
    (constraints.crMin !== undefined && optimistic.cr < constraints.crMin) ||
    (constraints.cdMin !== undefined && optimistic.cd < constraints.cdMin) ||
    (constraints.accMin !== undefined && optimistic.acc < constraints.accMin) ||
    (constraints.resMin !== undefined && optimistic.res < constraints.resMin) ||
    (constraints.ehpMin !== undefined && optimistic.ehp < constraints.ehpMin) ||
    (constraints.efficiencyMin !== undefined &&
      optimistic.efficiency < constraints.efficiencyMin)
  );
}

function canStillRespectMaximums(
  monster: Monster,
  partialStats: PartialBuildStats,
  config: MonsterConfig
): boolean {
  const constraints = config.stats;

  const currentHp =
    monster.hp +
    partialStats.hpFlat +
    (monster.baseHp * partialStats.hpPercent) / 100;
  const currentAtk =
    monster.atk +
    partialStats.atkFlat +
    (monster.baseAtk * partialStats.atkPercent) / 100;
  const currentDef =
    monster.def +
    partialStats.defFlat +
    (monster.baseDef * partialStats.defPercent) / 100;
  const currentSpd = monster.spd + partialStats.spd;
  const currentCr = monster.cr + partialStats.cr;
  const currentCd = monster.cd + partialStats.cd;
  const currentAcc = monster.acc + partialStats.acc;
  const currentRes = monster.res + partialStats.res;

  return !(
    (constraints.hpMax !== undefined && currentHp > constraints.hpMax) ||
    (constraints.atkMax !== undefined && currentAtk > constraints.atkMax) ||
    (constraints.defMax !== undefined && currentDef > constraints.defMax) ||
    (constraints.spdMax !== undefined && currentSpd > constraints.spdMax) ||
    (constraints.crMax !== undefined && currentCr > constraints.crMax) ||
    (constraints.cdMax !== undefined && currentCd > constraints.cdMax) ||
    (constraints.accMax !== undefined && currentAcc > constraints.accMax) ||
    (constraints.resMax !== undefined && currentRes > constraints.resMax)
  );
}

function calculateEfficiency(calculation: BuildCalculation): number {
  const stats = calculation.runeStats;

  return (
    stats.hpPercent +
    stats.atkPercent +
    stats.defPercent +
    stats.spd * 2 +
    stats.cr * 1.5 +
    stats.cd +
    stats.acc +
    stats.res
  );
}

function calculateScore(calculation: BuildCalculation): number {
  return (
    calculation.stats.spd * 100000000 +
    calculation.damage * 1000 +
    calculation.ehp
  );
}

function createOptimizationResult(
  monster: Monster,
  buildRunes: PreparedRune[],
  calculation: BuildCalculation
): OptimizationResult {
  const slot2Rune = buildRunes.find((rune) => rune.slot === 2);
  const slot4Rune = buildRunes.find((rune) => rune.slot === 4);
  const slot6Rune = buildRunes.find((rune) => rune.slot === 6);

  return {
    monsterId: monster.id,
    hp: calculation.stats.hp,
    atk: calculation.stats.atk,
    def: calculation.stats.def,
    spd: calculation.stats.spd,
    cr: calculation.stats.cr,
    cd: calculation.stats.cd,
    acc: calculation.stats.acc,
    res: calculation.stats.res,
    ehp: calculation.ehp,
    efficiency: calculateEfficiency(calculation),
    damage: calculation.damage,
    sets: calculation.activeSets,
    slot2: slot2Rune?.mainStatName ?? "",
    slot4: slot4Rune?.mainStatName ?? "",
    slot6: slot6Rune?.mainStatName ?? "",
    runeIds: [...buildRunes]
      .sort((first, second) => first.slot - second.slot)
      .map((rune) => rune.id),
    runes: [...buildRunes]
      .sort((first, second) => first.slot - second.slot)
      .map((rune) => ({
        id: rune.id,
        slot: rune.slot,
        setName: rune.setName,
        level: Math.max(0, Number(rune.source.upgrade_curr ?? 0)),
        stars: Math.max(1, Math.min(6, Number(rune.source.class ?? 6))),
      })),
    score: calculateScore(calculation),
  };
}

function getOptimizationLimits(config: MonsterConfig): OptimizationLimits {
  return {
    resultLimit: Math.max(1, Math.floor(config.resultLimit ?? 1000)),
    searchDepth: Math.max(1, Math.floor(config.searchDepth ?? 5000)),
    maxBranches: Math.max(1, Math.floor(config.maxBranches ?? 5_000_000)),
    maxDurationMs: Math.max(100, Math.floor(config.maxDurationMs ?? 30_000)),
  };
}

export function optimizeMonsterRunes(
  monster: Monster,
  config: MonsterConfig,
  availableRunes: PreparedRune[],
  onProgress?: (progress: OptimizationProgress) => void
): MonsterOptimizationOutput {
  const startTime = performance.now();
  const limits = getOptimizationLimits(config);
  const focus = getFocusList(config);

  const statistics: OptimizationStatistics = {
    branches: 0,
    terminalBuilds: 0,
    validBuilds: 0,
    pruned: 0,
    prunedSets: 0,
    prunedMinimums: 0,
    prunedMaximums: 0,
    prunedLimits: 0,
    elapsedMs: 0,
    stoppedByResultLimit: false,
    stoppedByBranchLimit: false,
    stoppedByDurationLimit: false,
    stoppedByRequest: false,
    approximate: false,
  };

  const { slotRunes, depthWasApplied } = createSlotRunes(
    monster,
    config,
    availableRunes
  );

  statistics.approximate = depthWasApplied;

  const analysis = analyzeSearchSpace(monster, config, slotRunes);

  if (!analysis.possible) {
    statistics.elapsedMs = performance.now() - startTime;
    return { results: [], totalBuilds: 0, statistics };
  }

  const remainingMaximums = buildRemainingMaximums(slotRunes);
  const topResults = new TopKResults(limits.resultLimit, focus);
  const buildRunes: PreparedRune[] = new Array(6);
  const usedRuneIds = new Set<number>();
  let lastProgressTime = startTime;

  function updateStopState(): boolean {
    if (stopRequested) {
      statistics.stoppedByRequest = true;
      statistics.approximate = true;
      return true;
    }

    if (statistics.branches >= limits.maxBranches) {
      statistics.stoppedByBranchLimit = true;
      statistics.approximate = true;
      return true;
    }

    if (performance.now() - startTime >= limits.maxDurationMs) {
      statistics.stoppedByDurationLimit = true;
      statistics.approximate = true;
      return true;
    }

    return false;
  }

  function sendProgress(force = false): void {
    if (!onProgress) {
      return;
    }

    const currentTime = performance.now();

    if (!force && currentTime - lastProgressTime < 250) {
      return;
    }

    lastProgressTime = currentTime;
    onProgress({
      explored: statistics.validBuilds,
      pruned: statistics.pruned,
      total: analysis.estimatedBuilds,
      branches: statistics.branches,
      elapsedMs: currentTime - startTime,
    });
  }

  function evaluateCompleteBuild(): void {
    statistics.terminalBuilds++;

    const orderedRunes = [...buildRunes].sort(
      (first, second) => first.slot - second.slot
    );

    if (!passesSlotFilters(orderedRunes, config)) {
      statistics.pruned++;
      return;
    }

    const activeSets = findValidActiveSets(orderedRunes, config);

    if (!activeSets) {
      statistics.pruned++;
      statistics.prunedSets++;
      return;
    }

    const calculation = calculateBuildStats(monster, orderedRunes, activeSets);
    const efficiency = calculateEfficiency(calculation);

    if (
      config.stats.efficiencyMin !== undefined &&
      efficiency < config.stats.efficiencyMin
    ) {
      statistics.pruned++;
      statistics.prunedMinimums++;
      return;
    }

    if (
      config.stats.efficiencyMax !== undefined &&
      efficiency > config.stats.efficiencyMax
    ) {
      statistics.pruned++;
      statistics.prunedMaximums++;
      return;
    }

    if (!passesStatFilters(calculation, config)) {
      statistics.pruned++;
      return;
    }

    topResults.add(
      createOptimizationResult(monster, orderedRunes, calculation)
    );
    statistics.validBuilds++;
  }

  function explore(slotIndex: number, partialStats: PartialBuildStats): void {
    if (updateStopState()) {
      return;
    }

    if (slotIndex >= slotRunes.length) {
      evaluateCompleteBuild();
      sendProgress();
      return;
    }

    const currentSlot = slotRunes[slotIndex];
    const nextSlotIndex = slotIndex + 1;
    const remaining = remainingMaximums[nextSlotIndex];

    for (const rune of currentSlot.runes) {
      statistics.branches++;

      if (updateStopState()) {
        return;
      }

      if (usedRuneIds.has(rune.id)) {
        continue;
      }

      const nextStats = addRuneStats(partialStats, rune);

      if (!canStillReachMinimums(monster, nextStats, remaining, config)) {
        statistics.pruned++;
        statistics.prunedMinimums++;
        continue;
      }

      if (!canStillRespectMaximums(monster, nextStats, config)) {
        statistics.pruned++;
        statistics.prunedMaximums++;
        continue;
      }

      buildRunes[rune.slot - 1] = rune;
      usedRuneIds.add(rune.id);
      explore(nextSlotIndex, nextStats);
      usedRuneIds.delete(rune.id);

      if (updateStopState()) {
        return;
      }
    }
  }

  explore(0, createEmptyPartialStats());

  statistics.elapsedMs = performance.now() - startTime;
  sendProgress(true);

  return {
    results: topResults.toSortedArray(),
    totalBuilds: statistics.terminalBuilds,
    statistics,
  };
}
