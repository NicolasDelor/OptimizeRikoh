import type { Monster } from "../types/Monster";
import type { MonsterConfig } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import { runeSetNames, mainStatNames, } from "../data/runeData";
import { getRuneBonus, getSetBonus, getStatValue } from "./statCalculator";
import { passesStatFilters, passesSetFilters, passesSlotFilters } from "./optimizerFilters";

export function optimizeMonsterRunes(
  monster: Monster,
  config: MonsterConfig,
  availableRunes: any[]
): OptimizationResult[] {

  const slot2Runes = availableRunes.filter(
    (r) =>
      r.slot_no === 2 &&
      r.occupied_id === 0
  );

  const slot4Runes = availableRunes.filter(
    (r) =>
      r.slot_no === 4 &&
      r.occupied_id === 0
  );

  const slot6Runes = availableRunes.filter(
    (r) =>
      r.slot_no === 6 &&
      r.occupied_id === 0
  );

const filteredSlot2Runes =
  config.slot2MainStats.length > 0
    ? slot2Runes.filter(
        (r) =>
          config.slot2MainStats.includes(
            mainStatNames[r.pri_eff?.[0]]
          )
      )
    : slot2Runes;

const filteredSlot4Runes =
  config.slot4MainStats.length > 0
    ? slot4Runes.filter(
        (r) =>
          config.slot4MainStats.includes(
            mainStatNames[r.pri_eff?.[0]]
          )
      )
    : slot4Runes;

const filteredSlot6Runes =
  config.slot6MainStats.length > 0
    ? slot6Runes.filter(
        (r) =>
          config.slot6MainStats.includes(
            mainStatNames[r.pri_eff?.[0]]
          )
      )
    : slot6Runes;
    console.log(
      "FILTERED SLOT6",
      filteredSlot6Runes.length
    );

    const results: OptimizationResult[] = [];

    for (const rune2 of filteredSlot2Runes) {
      for (const rune4 of filteredSlot4Runes) {
        for (const rune6 of filteredSlot6Runes) {
          results.push({
            monsterId: monster.id,

            hp: 0,
            atk: 0,
            def: 0,
            spd: 0,

            cr: 0,
            cd: 0,
            acc: 0,
            res: 0,

            runeIds: [
              rune2.rune_id,
              rune4.rune_id,
              rune6.rune_id,
            ],

            score: 0,
          });
        }
      }
    }

    console.log(
      "GENERATED BUILDS",
      results.length
    );

    return results;
}

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
      console.log("STAT FILTER FAILED");
      return [];
    }

    console.log("STAT FILTER OK");

    const activeSets = monster.runes
      ?.map((r) => runeSetNames[r.set_id])
      .filter(Boolean) ?? [];


    if (!passesSetFilters(activeSets, config)) {
      console.log("SET FILTER FAILED");
      return [];
    }

    console.log("SET FILTER OK");

    console.log("CALL SLOT FILTER");

    if (
      !passesSlotFilters(
        monster.runes ?? [],
        config
      )
    ) {
      console.log("SLOT FILTER FAILED");
      return [];
    }

    console.log("SLOT FILTER OK");
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