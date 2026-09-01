import type { MonsterConfig } from "../types/MonsterConfig";
import { mainStatNames } from "../data/runeData";

export function passesSlotFilters(runes: any[], config: MonsterConfig) {
  const slot2Rune = runes.find((r) => r.slot_no === 2);

  const slot4Rune = runes.find((r) => r.slot_no === 4);

  const slot6Rune = runes.find((r) => r.slot_no === 6);

  const slot2Main = mainStatNames[slot2Rune?.pri_eff?.[0]] ?? "";

  const slot4Main = mainStatNames[slot4Rune?.pri_eff?.[0]] ?? "";

  const slot6Main = mainStatNames[slot6Rune?.pri_eff?.[0]] ?? "";

  if (
    config.slot2MainStats.length > 0 &&
    !config.slot2MainStats.includes(slot2Main)
  ) {
    return false;
  }

  if (
    config.slot4MainStats.length > 0 &&
    !config.slot4MainStats.includes(slot4Main)
  ) {
    return false;
  }

  if (
    config.slot6MainStats.length > 0 &&
    !config.slot6MainStats.includes(slot6Main)
  ) {
    return false;
  }

  return true;
}

export function passesSetFilters(activeSets: string[], config: MonsterConfig) {
  const requiredSets = [
    ...(config.requiredSet1 ?? []),
    ...(config.requiredSet2 ?? []),
    ...(config.requiredSet3 ?? []),
  ].filter(Boolean);

  const requiredCounts: Record<string, number> = {};
  const activeCounts: Record<string, number> = {};

  requiredSets.forEach((set) => {
    requiredCounts[set] = (requiredCounts[set] ?? 0) + 1;
  });

  activeSets.forEach((set) => {
    activeCounts[set] = (activeCounts[set] ?? 0) + 1;
  });

  for (const [set, requiredCount] of Object.entries(requiredCounts)) {
    if ((activeCounts[set] ?? 0) < requiredCount) {
      return false;
    }
  }

  for (const forbiddenSet of config.forbiddenSets) {
    if (forbiddenSet && activeSets.includes(forbiddenSet)) {
      return false;
    }
  }

  return true;
}

export function passesStatFilters(
  stats: Record<string, number>,
  config: MonsterConfig
) {
  const hp = Math.round(stats.hp);
  const atk = Math.round(stats.atk);
  const def = Math.round(stats.def);
  const spd = Math.round(stats.spd);
  const cr = Math.round(stats.cr);
  const cd = Math.round(stats.cd);
  const acc = Math.round(stats.acc);
  const res = Math.round(stats.res);

  if (config.stats.hpMin !== undefined && hp < config.stats.hpMin) return false;
  if (config.stats.hpMax !== undefined && hp > config.stats.hpMax) return false;

  if (config.stats.atkMin !== undefined && atk < config.stats.atkMin)
    return false;
  if (config.stats.atkMax !== undefined && atk > config.stats.atkMax)
    return false;

  if (config.stats.defMin !== undefined && def < config.stats.defMin)
    return false;
  if (config.stats.defMax !== undefined && def > config.stats.defMax)
    return false;

  if (config.stats.spdMin !== undefined && spd < config.stats.spdMin)
    return false;
  if (config.stats.spdMax !== undefined && spd > config.stats.spdMax)
    return false;

  if (config.stats.crMin !== undefined && cr < config.stats.crMin) return false;
  if (config.stats.crMax !== undefined && cr > config.stats.crMax) return false;

  if (config.stats.cdMin !== undefined && cd < config.stats.cdMin) return false;
  if (config.stats.cdMax !== undefined && cd > config.stats.cdMax) return false;

  if (config.stats.accMin !== undefined && acc < config.stats.accMin)
    return false;
  if (config.stats.accMax !== undefined && acc > config.stats.accMax)
    return false;

  if (config.stats.resMin !== undefined && res < config.stats.resMin)
    return false;
  if (config.stats.resMax !== undefined && res > config.stats.resMax)
    return false;

  return true;
}
