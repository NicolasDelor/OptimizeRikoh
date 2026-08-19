import type { Monster } from "../types/Monster";
import type { MonsterConfig } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import { passesStatFilters, passesSetFilters } from "./optimizerFilters";
import { runeSetNames } from "../data/runeData";
import { getRuneBonus, getSetBonus, getStatValue } from "./statCalculator";

export function optimizeMonster(
  monster: Monster,
  config: MonsterConfig
): OptimizationResult[] {
    const runes = monster.runes ?? [];

    const stats = {
      hp: monster.hp + getStatValue(
        runes,
        1,
        2,
        monster.baseHp ?? monster.hp,
        "hp"
      ),

      atk: monster.atk + getStatValue(
        runes,
        3,
        4,
        monster.baseAtk ?? monster.atk,
        "atk"
      ),

      def: monster.def + getStatValue(
        runes,
        5,
        6,
        monster.baseDef ?? monster.def,
        "def"
      ),

      spd:
        monster.spd +
        getRuneBonus(runes, 8) +
        getSetBonus(runes, "spd"),

      cr:
        monster.cr +
        getRuneBonus(runes, 9) +
        getSetBonus(runes, "cr"),

      cd:
        monster.cd +
        getRuneBonus(runes, 10),

      acc:
        monster.acc +
        getRuneBonus(runes, 12) +
        getSetBonus(runes, "acc"),

      res:
        monster.res +
        getRuneBonus(runes, 11) +
        getSetBonus(runes, "res"),
    };


    if (!passesStatFilters(stats, config)) {
      return [];
    }

    const activeSets = monster.runes
      ?.map((r) => runeSetNames[r.set_id])
      .filter(Boolean) ?? [];

    if (!passesSetFilters(activeSets, config)) {
      return [];
    }
  return [
    {
      monsterId: monster.id,

     hp: stats.hp,
     atk: stats.atk,
     def: stats.def,
     spd: stats.spd,

     cr: stats.cr,
     cd: stats.cd,
     acc: stats.acc,
     res: stats.res,

      runeIds: [],

      score: 0,
    },
  ];
}