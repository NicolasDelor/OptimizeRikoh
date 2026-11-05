import type { Monster } from "../types/Monster";
import type { MonsterConfig } from "../types/MonsterConfig";
import type { PreparedRune, RuneStats } from "../types/Rune";
import { generateSetPatterns, type SetPattern } from "./setPatternGenerator";
import { getDisplayedStatValue } from "./optimizerFilters";

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

function emptyMaximums(): SearchSpaceMaximums {
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

function maximum(
  runes: readonly PreparedRune[],
  selector: (stats: RuneStats) => number
): number {
  let value = 0;
  for (const rune of runes) value = Math.max(value, selector(rune.stats));
  return value;
}

function estimate(slotRunes: readonly SearchSlot[]) {
  let estimatedBuilds = 1;
  for (const slot of slotRunes) {
    if (slot.runes.length === 0) {
      return { estimatedBuilds: 0, estimatedBuildsCapped: false };
    }
    if (
      estimatedBuilds > Math.floor(MAX_ESTIMATED_BUILDS / slot.runes.length)
    ) {
      return {
        estimatedBuilds: MAX_ESTIMATED_BUILDS,
        estimatedBuildsCapped: true,
      };
    }
    estimatedBuilds *= slot.runes.length;
  }
  return { estimatedBuilds, estimatedBuildsCapped: false };
}

function collectMaximums(
  slotRunes: readonly SearchSlot[]
): SearchSpaceMaximums {
  const result = emptyMaximums();
  for (const slot of slotRunes) {
    result.hpFlat += maximum(slot.runes, (s) => s.hpFlat);
    result.hpPercent += maximum(slot.runes, (s) => s.hpPercent);
    result.atkFlat += maximum(slot.runes, (s) => s.atkFlat);
    result.atkPercent += maximum(slot.runes, (s) => s.atkPercent);
    result.defFlat += maximum(slot.runes, (s) => s.defFlat);
    result.defPercent += maximum(slot.runes, (s) => s.defPercent);
    result.spd += maximum(slot.runes, (s) => s.spd);
    result.cr += maximum(slot.runes, (s) => s.cr);
    result.cd += maximum(slot.runes, (s) => s.cd);
    result.acc += maximum(slot.runes, (s) => s.acc);
    result.res += maximum(slot.runes, (s) => s.res);
  }
  return result;
}

function patternHasAvailablePieces(
  pattern: SetPattern,
  slotRunes: readonly SearchSlot[]
): boolean {
  const available: Record<string, number> = {};
  for (const slot of slotRunes) {
    for (const setName of new Set(slot.runes.map((rune) => rune.setName))) {
      available[setName] = (available[setName] ?? 0) + 1;
    }
  }
  for (const [setName, pieces] of Object.entries(pattern.requiredPieces)) {
    if ((available[setName] ?? 0) < (pieces ?? 0)) return false;
  }
  return (available.Intangible ?? 0) >= pattern.intangiblePieces;
}

function hasMinimumFailure(
  value: number,
  minimum: number | undefined
): boolean {
  return minimum !== undefined && getDisplayedStatValue(value) < minimum;
}

export function analyzeSearchSpace(
  monster: Monster,
  config: MonsterConfig,
  slotRunes: SearchSlot[]
): SearchSpaceAnalysis {
  const impossibleReasons: string[] = [];
  const slots = new Map(slotRunes.map((slot) => [slot.slot, slot]));

  for (let slot = 1; slot <= 6; slot++) {
    if (!slots.get(slot)?.runes.length) {
      impossibleReasons.push(`Aucune rune candidate pour le slot ${slot}.`);
    }
  }

  const buildEstimate = estimate(slotRunes);
  const r = collectMaximums(slotRunes);

  const hp =
    monster.hp + r.hpFlat + (monster.baseHp * (r.hpPercent + 45)) / 100;
  const atk =
    monster.atk + r.atkFlat + (monster.baseAtk * (r.atkPercent + 35)) / 100;
  const def =
    monster.def + r.defFlat + (monster.baseDef * (r.defPercent + 45)) / 100;
  const spd = monster.spd + r.spd + monster.baseSpd * 0.25;
  const cr = monster.cr + r.cr + 36;
  const cd = monster.cd + r.cd + 40;
  const acc = monster.acc + r.acc + 60;
  const res = monster.res + r.res + 60;
  const ehp = (hp * (1140 + def)) / 1000;

  const maximumStats = {
    hp: getDisplayedStatValue(hp),
    atk: getDisplayedStatValue(atk),
    def: getDisplayedStatValue(def),
    spd: getDisplayedStatValue(spd),
    cr: getDisplayedStatValue(cr),
    cd: getDisplayedStatValue(cd),
    acc: getDisplayedStatValue(acc),
    res: getDisplayedStatValue(res),
    ehp: getDisplayedStatValue(ehp),
  };

  const c = config.stats;
  const checks: Array<[keyof typeof maximumStats, number | undefined, string]> =
    [
      ["hp", c.hpMin, "HP"],
      ["atk", c.atkMin, "ATK"],
      ["def", c.defMin, "DEF"],
      ["spd", c.spdMin, "SPD"],
      ["cr", c.crMin, "CR"],
      ["cd", c.cdMin, "CD"],
      ["acc", c.accMin, "ACC"],
      ["res", c.resMin, "RES"],
      ["ehp", c.ehpMin, "EHP"],
    ];

  for (const [key, minimum, label] of checks) {
    if (hasMinimumFailure(maximumStats[key], minimum)) {
      impossibleReasons.push(
        `${label} minimum impossible : maximum optimiste ${maximumStats[key]}.`
      );
    }
  }

  const requiredSets = [
    ...(config.requiredSet1 ?? []),
    ...(config.requiredSet2 ?? []),
    ...(config.requiredSet3 ?? []),
  ].filter(Boolean);
  const validSetPatterns = generateSetPatterns(requiredSets).filter((pattern) =>
    patternHasAvailablePieces(pattern, slotRunes)
  );

  if (requiredSets.length > 0 && validSetPatterns.length === 0) {
    impossibleReasons.push(
      "Aucune combinaison de runes disponible ne peut compléter les sets requis."
    );
  }

  return {
    possible: impossibleReasons.length === 0,
    ...buildEstimate,
    maximumStats,
    maximumRuneStats: r,
    validSetPatterns,
    impossibleReasons,
  };
}
