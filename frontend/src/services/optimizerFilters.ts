import type { MonsterConfig } from "../types/MonsterConfig";

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