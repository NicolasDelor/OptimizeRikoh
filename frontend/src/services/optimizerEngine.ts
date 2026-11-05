import type { Monster } from "../types/Monster";
import type { MonsterConfig, OptimizableStat } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import type { PreparedRune, RuneStats } from "../types/Rune";
import { calculateBuildStats, type BuildCalculation } from "./statCalculator";
import {
  findValidActiveSets,
  getDisplayedStatValue,
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

type RemainingMaximums = SearchSpaceMaximums;

let stopRequested = false;

export function resetOptimizationStop(): void {
  stopRequested = false;
}

function emptyStats(): RuneStats {
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

function addRuneStats(current: RuneStats, rune: PreparedRune): RuneStats {
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
  requiredSets: ReadonlySet<string>
): number {
  const firstRequired =
    requiredSets.has(first.setName) || first.setName === "Intangible";
  const secondRequired =
    requiredSets.has(second.setName) || second.setName === "Intangible";
  if (firstRequired !== secondRequired) return firstRequired ? -1 : 1;

  for (const stat of focus) {
    const difference =
      getRuneFocusValue(second, stat, monster) -
      getRuneFocusValue(first, stat, monster);
    if (difference !== 0) return difference;
  }
  return first.id - second.id;
}

function createSlotRunes(
  monster: Monster,
  config: MonsterConfig,
  availableRunes: PreparedRune[]
): { slotRunes: SearchSlot[]; depthWasApplied: boolean } {
  const focus = getFocusList(config);
  const requiredSets = new Set(getRequiredSets(config));
  const depth = Math.max(1, Math.floor(config.searchDepth ?? 5000));
  let depthWasApplied = false;

  const filtered = availableRunes.filter((rune) => {
    const accepted =
      rune.slot === 2
        ? config.slot2MainStats
        : rune.slot === 4
          ? config.slot4MainStats
          : rune.slot === 6
            ? config.slot6MainStats
            : [];
    return accepted.length === 0 || accepted.includes(rune.mainStatName);
  });

  const slotRunes: SearchSlot[] = [];
  for (let slot = 1; slot <= 6; slot++) {
    let runes = filtered
      .filter((rune) => rune.slot === slot)
      .sort((a, b) => compareRunes(a, b, monster, focus, requiredSets));
    if (runes.length > depth) {
      runes = runes.slice(0, depth);
      depthWasApplied = true;
    }
    slotRunes.push({ slot, runes });
  }
  return { slotRunes, depthWasApplied };
}

function maxForSlot(
  runes: readonly PreparedRune[],
  selector: (stats: RuneStats) => number
): number {
  let maximum = 0;
  for (const rune of runes) maximum = Math.max(maximum, selector(rune.stats));
  return maximum;
}

function buildRemainingMaximums(
  slotRunes: readonly SearchSlot[]
): RemainingMaximums[] {
  const result = new Array<RemainingMaximums>(slotRunes.length + 1);
  let running = emptyStats();
  result[slotRunes.length] = emptyStats();

  for (let index = slotRunes.length - 1; index >= 0; index--) {
    const runes = slotRunes[index].runes;
    running = {
      hpFlat: running.hpFlat + maxForSlot(runes, (s) => s.hpFlat),
      hpPercent: running.hpPercent + maxForSlot(runes, (s) => s.hpPercent),
      atkFlat: running.atkFlat + maxForSlot(runes, (s) => s.atkFlat),
      atkPercent: running.atkPercent + maxForSlot(runes, (s) => s.atkPercent),
      defFlat: running.defFlat + maxForSlot(runes, (s) => s.defFlat),
      defPercent: running.defPercent + maxForSlot(runes, (s) => s.defPercent),
      spd: running.spd + maxForSlot(runes, (s) => s.spd),
      cr: running.cr + maxForSlot(runes, (s) => s.cr),
      cd: running.cd + maxForSlot(runes, (s) => s.cd),
      acc: running.acc + maxForSlot(runes, (s) => s.acc),
      res: running.res + maxForSlot(runes, (s) => s.res),
    };
    result[index] = { ...running };
  }
  return result;
}

function optimisticStats(
  monster: Monster,
  partial: RuneStats,
  remaining: RuneStats
) {
  const hp =
    monster.hp +
    partial.hpFlat +
    remaining.hpFlat +
    (monster.baseHp * (partial.hpPercent + remaining.hpPercent + 45)) / 100;
  const atk =
    monster.atk +
    partial.atkFlat +
    remaining.atkFlat +
    (monster.baseAtk * (partial.atkPercent + remaining.atkPercent + 35)) / 100;
  const def =
    monster.def +
    partial.defFlat +
    remaining.defFlat +
    (monster.baseDef * (partial.defPercent + remaining.defPercent + 45)) / 100;
  const spd =
    monster.spd + partial.spd + remaining.spd + monster.baseSpd * 0.25;
  const cr = monster.cr + partial.cr + remaining.cr + 36;
  const cd = monster.cd + partial.cd + remaining.cd + 40;
  const acc = monster.acc + partial.acc + remaining.acc + 60;
  const res = monster.res + partial.res + remaining.res + 60;
  const ehp = (hp * (1140 + def)) / 1000;
  const efficiency =
    partial.hpPercent +
    remaining.hpPercent +
    partial.atkPercent +
    remaining.atkPercent +
    partial.defPercent +
    remaining.defPercent +
    (partial.spd + remaining.spd) * 2 +
    (partial.cr + remaining.cr) * 1.5 +
    partial.cd +
    remaining.cd +
    partial.acc +
    remaining.acc +
    partial.res +
    remaining.res;
  return { hp, atk, def, spd, cr, cd, acc, res, ehp, efficiency };
}

function belowDisplayedMinimum(
  value: number,
  minimum: number | undefined
): boolean {
  return minimum !== undefined && getDisplayedStatValue(value) < minimum;
}

function aboveDisplayedMaximum(
  value: number,
  maximum: number | undefined
): boolean {
  return maximum !== undefined && getDisplayedStatValue(value) > maximum;
}

function canStillReachMinimums(
  monster: Monster,
  partial: RuneStats,
  remaining: RuneStats,
  config: MonsterConfig
): boolean {
  const value = optimisticStats(monster, partial, remaining);
  const c = config.stats;
  return !(
    belowDisplayedMinimum(value.hp, c.hpMin) ||
    belowDisplayedMinimum(value.atk, c.atkMin) ||
    belowDisplayedMinimum(value.def, c.defMin) ||
    belowDisplayedMinimum(value.spd, c.spdMin) ||
    belowDisplayedMinimum(value.cr, c.crMin) ||
    belowDisplayedMinimum(value.cd, c.cdMin) ||
    belowDisplayedMinimum(value.acc, c.accMin) ||
    belowDisplayedMinimum(value.res, c.resMin) ||
    belowDisplayedMinimum(value.ehp, c.ehpMin) ||
    belowDisplayedMinimum(value.efficiency, c.efficiencyMin)
  );
}

function canStillRespectMaximums(
  monster: Monster,
  partial: RuneStats,
  config: MonsterConfig
): boolean {
  const c = config.stats;
  const hp =
    monster.hp + partial.hpFlat + (monster.baseHp * partial.hpPercent) / 100;
  const atk =
    monster.atk +
    partial.atkFlat +
    (monster.baseAtk * partial.atkPercent) / 100;
  const def =
    monster.def +
    partial.defFlat +
    (monster.baseDef * partial.defPercent) / 100;
  return !(
    aboveDisplayedMaximum(hp, c.hpMax) ||
    aboveDisplayedMaximum(atk, c.atkMax) ||
    aboveDisplayedMaximum(def, c.defMax) ||
    aboveDisplayedMaximum(monster.spd + partial.spd, c.spdMax) ||
    aboveDisplayedMaximum(monster.cr + partial.cr, c.crMax) ||
    aboveDisplayedMaximum(monster.cd + partial.cd, c.cdMax) ||
    aboveDisplayedMaximum(monster.acc + partial.acc, c.accMax) ||
    aboveDisplayedMaximum(monster.res + partial.res, c.resMax)
  );
}

function calculateEfficiency(calculation: BuildCalculation): number {
  const s = calculation.runeStats;
  return (
    s.hpPercent +
    s.atkPercent +
    s.defPercent +
    s.spd * 2 +
    s.cr * 1.5 +
    s.cd +
    s.acc +
    s.res
  );
}

function calculateScore(calculation: BuildCalculation): number {
  return (
    calculation.stats.spd * 100000000 +
    calculation.damage * 1000 +
    calculation.ehp
  );
}

function createResult(
  monster: Monster,
  buildRunes: PreparedRune[],
  calculation: BuildCalculation
): OptimizationResult {
  const ordered = [...buildRunes].sort((a, b) => a.slot - b.slot);
  const slot2 = ordered.find((rune) => rune.slot === 2);
  const slot4 = ordered.find((rune) => rune.slot === 4);
  const slot6 = ordered.find((rune) => rune.slot === 6);
  return {
    monsterId: monster.id,
    ...calculation.stats,
    ehp: calculation.ehp,
    efficiency: calculateEfficiency(calculation),
    damage: calculation.damage,
    sets: calculation.activeSets,
    slot2: slot2?.mainStatName ?? "",
    slot4: slot4?.mainStatName ?? "",
    slot6: slot6?.mainStatName ?? "",
    runeIds: ordered.map((rune) => rune.id),
    runes: ordered.map((rune) => ({
      id: rune.id,
      slot: rune.slot,
      setName: rune.setName,
      level: Math.max(0, Number(rune.source.upgrade_curr ?? 0)),
      stars: Math.max(1, Math.min(6, Number(rune.source.class ?? 6))),
    })),
    score: calculateScore(calculation),
  };
}

export function optimizeMonsterRunes(
  monster: Monster,
  config: MonsterConfig,
  availableRunes: PreparedRune[],
  onProgress?: (progress: OptimizationProgress) => void
): MonsterOptimizationOutput {
  const startTime = performance.now();
  const resultLimit = Math.max(1, Math.floor(config.resultLimit ?? 1000));
  const maxBranches = Math.max(1, Math.floor(config.maxBranches ?? 5_000_000));
  const maxDurationMs = Math.max(
    100,
    Math.floor(config.maxDurationMs ?? 30_000)
  );
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
  const topResults = new TopKResults(resultLimit, focus);
  const buildRunes: PreparedRune[] = new Array(6);
  const usedRuneIds = new Set<number>();
  let lastProgressTime = startTime;

  const mustStop = (): boolean => {
    if (stopRequested) {
      statistics.stoppedByRequest = true;
      statistics.approximate = true;
      return true;
    }
    if (statistics.branches >= maxBranches) {
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
  };

  const sendProgress = (force = false): void => {
    if (!onProgress) return;
    const now = performance.now();
    if (!force && now - lastProgressTime < 250) return;
    lastProgressTime = now;
    onProgress({
      explored: statistics.validBuilds,
      pruned: statistics.pruned,
      total: analysis.estimatedBuilds,
      branches: statistics.branches,
      elapsedMs: now - startTime,
    });
  };

  const evaluate = (): void => {
    statistics.terminalBuilds++;
    const ordered = [...buildRunes].sort((a, b) => a.slot - b.slot);
    if (!passesSlotFilters(ordered, config)) {
      statistics.pruned++;
      return;
    }
    const activeSets = findValidActiveSets(ordered, config);
    if (!activeSets) {
      statistics.pruned++;
      statistics.prunedSets++;
      return;
    }
    const calculation = calculateBuildStats(monster, ordered, activeSets);
    const efficiency = calculateEfficiency(calculation);
    if (belowDisplayedMinimum(efficiency, config.stats.efficiencyMin)) {
      statistics.pruned++;
      statistics.prunedMinimums++;
      return;
    }
    if (aboveDisplayedMaximum(efficiency, config.stats.efficiencyMax)) {
      statistics.pruned++;
      statistics.prunedMaximums++;
      return;
    }
    if (!passesStatFilters(calculation, config)) {
      statistics.pruned++;
      return;
    }
    topResults.add(createResult(monster, ordered, calculation));
    statistics.validBuilds++;
  };

  const explore = (slotIndex: number, partial: RuneStats): void => {
    if (mustStop()) return;
    if (slotIndex >= slotRunes.length) {
      evaluate();
      sendProgress();
      return;
    }
    const nextIndex = slotIndex + 1;
    for (const rune of slotRunes[slotIndex].runes) {
      statistics.branches++;
      if (mustStop()) return;
      if (usedRuneIds.has(rune.id)) continue;
      const next = addRuneStats(partial, rune);
      if (
        !canStillReachMinimums(
          monster,
          next,
          remainingMaximums[nextIndex],
          config
        )
      ) {
        statistics.pruned++;
        statistics.prunedMinimums++;
        continue;
      }
      if (!canStillRespectMaximums(monster, next, config)) {
        statistics.pruned++;
        statistics.prunedMaximums++;
        continue;
      }
      buildRunes[rune.slot - 1] = rune;
      usedRuneIds.add(rune.id);
      explore(nextIndex, next);
      usedRuneIds.delete(rune.id);
      if (mustStop()) return;
    }
  };

  explore(0, emptyStats());
  statistics.elapsedMs = performance.now() - startTime;
  sendProgress(true);
  return {
    results: topResults.toSortedArray(),
    totalBuilds: statistics.terminalBuilds,
    statistics,
  };
}
