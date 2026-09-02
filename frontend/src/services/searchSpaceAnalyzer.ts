import type { Monster } from "../types/Monster";
import type { MonsterConfig } from "../types/MonsterConfig";

export function analyzeSearchSpace(
  monster: Monster,
  config: MonsterConfig,
  slotRunes: { slot: number; runes: any[] }[]
) {
  const maxStats = {
    hp: monster.hp,
    atk: monster.atk,
    def: monster.def,
    spd: monster.spd,
    cr: monster.cr,
    cd: monster.cd,
    acc: monster.acc,
    res: monster.res,
  };

  for (const slot of slotRunes) {
    maxStats.hp += Math.max(...slot.runes.map((r) => r.cachedHp ?? 0), 0);
    maxStats.atk += Math.max(...slot.runes.map((r) => r.cachedAtk ?? 0), 0);
    maxStats.def += Math.max(...slot.runes.map((r) => r.cachedDef ?? 0), 0);

    maxStats.spd += Math.max(...slot.runes.map((r) => r.cachedSpd ?? 0), 0);
    maxStats.cr += Math.max(...slot.runes.map((r) => r.cachedCr ?? 0), 0);
    maxStats.cd += Math.max(...slot.runes.map((r) => r.cachedCd ?? 0), 0);
    maxStats.acc += Math.max(...slot.runes.map((r) => r.cachedAcc ?? 0), 0);
    maxStats.res += Math.max(...slot.runes.map((r) => r.cachedRes ?? 0), 0);
  }

  const impossible =
    (config.stats.hpMin && maxStats.hp < config.stats.hpMin) ||
    (config.stats.atkMin && maxStats.atk < config.stats.atkMin) ||
    (config.stats.defMin && maxStats.def < config.stats.defMin) ||
    (config.stats.spdMin && maxStats.spd < config.stats.spdMin) ||
    (config.stats.crMin && maxStats.cr < config.stats.crMin) ||
    (config.stats.cdMin && maxStats.cd < config.stats.cdMin) ||
    (config.stats.accMin && maxStats.acc < config.stats.accMin) ||
    (config.stats.resMin && maxStats.res < config.stats.resMin);

  const estimatedBuilds = slotRunes.reduce(
    (total, slot) => total * slot.runes.length,
    1
  );

  return {
    possible: !impossible,
    estimatedBuilds,
    maxStats,
  };
}
