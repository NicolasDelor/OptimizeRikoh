import type { MonsterConfig } from "../types/MonsterConfig";
import { mainStatNames } from "../data/runeData";


export function passesSlotFilters(

  runes: any[],
  config: MonsterConfig
) {

  const slot2Rune = runes.find(
    (r) => r.slot_no === 2
  );

  const slot4Rune = runes.find(
    (r) => r.slot_no === 4
  );

  const slot6Rune = runes.find(
    (r) => r.slot_no === 6
  );

  const slot2Main =
    mainStatNames[slot2Rune?.pri_eff?.[0]] ?? "";

  const slot4Main =
    mainStatNames[slot4Rune?.pri_eff?.[0]] ?? "";

  const slot6Main =
    mainStatNames[slot6Rune?.pri_eff?.[0]] ?? "";

     console.log(
          "SLOTS",
          slot2Main,
          slot4Main,
          slot6Main
        );

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

export function passesSetFilters(
  activeSets: string[],
  config: MonsterConfig
) {
  for (const requiredSet of config.requiredSets) {
    if (
      requiredSet &&
      !activeSets.includes(requiredSet)
    ) {
      return false;
    }
  }

  for (const forbiddenSet of config.forbiddenSets) {
    if (
      forbiddenSet &&
      activeSets.includes(forbiddenSet)
    ) {
      return false;
    }
  }

  return true;
}

export function passesStatFilters(
  stats: Record<string, number>,
  config: MonsterConfig
) {

    if (
      config.stats.hpMin !== undefined &&
      stats.hp < config.stats.hpMin
    ) {
      return false;
    }

    if (
      config.stats.hpMax !== undefined &&
      stats.hp > config.stats.hpMax
    ) {
      return false;
    }

    if (
      config.stats.atkMin !== undefined &&
      stats.atk < config.stats.atkMin
    ) {
      return false;
    }

    if (
      config.stats.atkMax !== undefined &&
      stats.atk > config.stats.atkMax
    ) {
      return false;
    }

    if (
      config.stats.defMin !== undefined &&
      stats.def < config.stats.defMin
    ) {
      return false;
    }

    if (
      config.stats.defMax !== undefined &&
      stats.def > config.stats.defMax
    ) {
      return false;
    }

    if (
      config.stats.spdMin !== undefined &&
      stats.spd < config.stats.spdMin
    ) {
      return false;
    }

    if (
      config.stats.spdMax !== undefined &&
      stats.spd > config.stats.spdMax
    ) {
      return false;
    }

    if (
      config.stats.crMin !== undefined &&
      stats.cr < config.stats.crMin
    ) {
      return false;
    }

    if (
      config.stats.crMax !== undefined &&
      stats.cr > config.stats.crMax
    ) {
      return false;
    }

    if (
      config.stats.cdMin !== undefined &&
      stats.cd < config.stats.cdMin
    ) {
      return false;
    }

    if (
      config.stats.cdMax !== undefined &&
      stats.cd > config.stats.cdMax
    ) {
      return false;
    }

    if (
      config.stats.accMin !== undefined &&
      stats.acc < config.stats.accMin
    ) {
      return false;
    }

    if (
      config.stats.accMax !== undefined &&
      stats.acc > config.stats.accMax
    ) {
      return false;
    }

    if (
      config.stats.resMin !== undefined &&
      stats.res < config.stats.resMin
    ) {
      return false;
    }

    if (
      config.stats.resMax !== undefined &&
      stats.res > config.stats.resMax
    ) {
      return false;
    }

    return true;

}