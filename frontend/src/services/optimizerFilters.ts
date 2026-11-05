import type { RuneSetName } from "../data/runeData";
import type { MonsterConfig } from "../types/MonsterConfig";
import type { PreparedRune } from "../types/Rune";
import type { BuildCalculation } from "./statCalculator";
import { getPossibleActiveSetCombinations } from "./statCalculator";

export function getDisplayedStatValue(value: number): number {
  return Number.isFinite(value) ? Math.ceil(value) : 0;
}

function respectsMinimum(value: number, minimum: number | undefined): boolean {
  return minimum === undefined || getDisplayedStatValue(value) >= minimum;
}

function respectsMaximum(value: number, maximum: number | undefined): boolean {
  return maximum === undefined || getDisplayedStatValue(value) <= maximum;
}

export function passesStatFilters(
  calculation: BuildCalculation,
  config: MonsterConfig
): boolean {
  const { stats, ehp } = calculation;
  const constraints = config.stats;

  return (
    respectsMinimum(stats.hp, constraints.hpMin) &&
    respectsMaximum(stats.hp, constraints.hpMax) &&
    respectsMinimum(stats.atk, constraints.atkMin) &&
    respectsMaximum(stats.atk, constraints.atkMax) &&
    respectsMinimum(stats.def, constraints.defMin) &&
    respectsMaximum(stats.def, constraints.defMax) &&
    respectsMinimum(stats.spd, constraints.spdMin) &&
    respectsMaximum(stats.spd, constraints.spdMax) &&
    respectsMinimum(stats.cr, constraints.crMin) &&
    respectsMaximum(stats.cr, constraints.crMax) &&
    respectsMinimum(stats.cd, constraints.cdMin) &&
    respectsMaximum(stats.cd, constraints.cdMax) &&
    respectsMinimum(stats.acc, constraints.accMin) &&
    respectsMaximum(stats.acc, constraints.accMax) &&
    respectsMinimum(stats.res, constraints.resMin) &&
    respectsMaximum(stats.res, constraints.resMax) &&
    respectsMinimum(ehp, constraints.ehpMin) &&
    respectsMaximum(ehp, constraints.ehpMax)
  );
}

function countSets(sets: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const set of sets) counts[set] = (counts[set] ?? 0) + 1;
  return counts;
}

export function getRequiredSets(config: MonsterConfig): string[] {
  return [
    ...(config.requiredSet1 ?? []),
    ...(config.requiredSet2 ?? []),
    ...(config.requiredSet3 ?? []),
  ].filter(Boolean);
}

export function passesResolvedSetFilters(
  activeSets: readonly RuneSetName[],
  config: MonsterConfig
): boolean {
  const requiredCounts = countSets(getRequiredSets(config));
  const activeCounts = countSets(activeSets);

  for (const [setName, requiredCount] of Object.entries(requiredCounts)) {
    if ((activeCounts[setName] ?? 0) < requiredCount) return false;
  }
  return true;
}

function containsForbiddenRune(
  runes: readonly PreparedRune[],
  config: MonsterConfig
): boolean {
  const forbiddenSets = new Set(config.forbiddenSets ?? []);
  return runes.some((rune) => forbiddenSets.has(rune.setName));
}

export function findValidActiveSets(
  runes: PreparedRune[],
  config: MonsterConfig
): RuneSetName[] | null {
  if (containsForbiddenRune(runes, config)) return null;

  for (const activeSets of getPossibleActiveSetCombinations(runes)) {
    if (passesResolvedSetFilters(activeSets, config)) return activeSets;
  }
  return null;
}

export function passesSetFilters(
  activeSets: readonly RuneSetName[],
  config: MonsterConfig
): boolean {
  return passesResolvedSetFilters(activeSets, config);
}

function passesMainStatFilter(
  rune: PreparedRune | undefined,
  acceptedMainStats: readonly string[] | undefined
): boolean {
  if (!acceptedMainStats || acceptedMainStats.length === 0) return true;
  return Boolean(rune && acceptedMainStats.includes(rune.mainStatName));
}

export function passesSlotFilters(
  runes: PreparedRune[],
  config: MonsterConfig
): boolean {
  return (
    passesMainStatFilter(
      runes.find((rune) => rune.slot === 2),
      config.slot2MainStats
    ) &&
    passesMainStatFilter(
      runes.find((rune) => rune.slot === 4),
      config.slot4MainStats
    ) &&
    passesMainStatFilter(
      runes.find((rune) => rune.slot === 6),
      config.slot6MainStats
    )
  );
}
