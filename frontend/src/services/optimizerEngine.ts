import type { Monster } from "../types/Monster";
import type { MonsterConfig } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import { runeSetNames, mainStatNames, runeSetPieces } from "../data/runeData";
import { getRuneBonus, getSetBonus, getStatValue } from "./statCalculator";
import { passesStatFilters, passesSetFilters, passesSlotFilters } from "./optimizerFilters";

export function optimizeMonsterRunes(
  monster: Monster,
  config: MonsterConfig,
  availableRunes: any[]
): OptimizationResult[] {

    const requiredSets = config.requiredSets
      .filter(Boolean);

    const candidateRunes = availableRunes.filter(
      (r) => r.occupied_id === 0
    );

  const slot2Runes = candidateRunes.filter(
    (r) =>
      r.slot_no === 2 &&
      r.occupied_id === 0
  );

  const slot4Runes = candidateRunes.filter(
    (r) =>
      r.slot_no === 4 &&
      r.occupied_id === 0
  );

  const slot6Runes = candidateRunes.filter(
    (r) =>
      r.slot_no === 6 &&
      r.occupied_id === 0
  );

    const slot1Runes = candidateRunes.filter(
      (r) =>
        r.slot_no === 1 &&
        r.occupied_id === 0
    );

    const slot3Runes = candidateRunes.filter(
      (r) =>
        r.slot_no === 3 &&
        r.occupied_id === 0
    );

    const slot5Runes = candidateRunes.filter(
      (r) =>
        r.slot_no === 5 &&
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

    const results: OptimizationResult[] = [];
    console.log(
    "COMBINATIONS",
    slot1Runes.length *
    filteredSlot2Runes.length *
    slot3Runes.length *
    filteredSlot4Runes.length *
    slot5Runes.length *
    filteredSlot6Runes.length
    );

    for (const rune1 of slot1Runes) {
      for (const rune2 of filteredSlot2Runes) {
        for (const rune3 of slot3Runes) {
          for (const rune4 of filteredSlot4Runes) {
            for (const rune5 of slot5Runes) {
              for (const rune6 of filteredSlot6Runes) {
          const buildRunes = [
            rune1,
            rune2,
            rune3,
            rune4,
            rune5,
            rune6,
          ];
      if (buildRunes.length !== 6) {
        continue;
      }

          const stats = {
            hp:
              monster.hp +
              getStatValue(
                buildRunes,
                1,
                2,
                monster.baseHp ?? monster.hp,
                "hp"
              ),

            atk:
              monster.atk +
              getStatValue(
                buildRunes,
                3,
                4,
                monster.baseAtk ?? monster.atk,
                "atk"
              ),

            def:
              monster.def +
              getStatValue(
                buildRunes,
                5,
                6,
                monster.baseDef ?? monster.def,
                "def"
              ),

            spd:
              monster.spd +
              getRuneBonus(buildRunes, 8) +
              getSetBonus(buildRunes, "spd"),

            cr:
              monster.cr +
              getRuneBonus(buildRunes, 9) +
              getSetBonus(buildRunes, "cr"),

            cd:
              monster.cd +
              getRuneBonus(buildRunes, 10),

            acc:
              monster.acc +
              getRuneBonus(buildRunes, 12) +
              getSetBonus(buildRunes, "acc"),

            res:
              monster.res +
              getRuneBonus(buildRunes, 11) +
              getSetBonus(buildRunes, "res"),
          };
          const ehp =
            stats.hp *
            (1140 + stats.def) /
            1000;

          if (!passesStatFilters(stats, config)) {
            continue;
          }
           const setCounts: Record<string, number> = {};

           buildRunes.forEach((r) => {
             const setName = runeSetNames[r.set_id];

             if (!setName) {
               return;
             }

             setCounts[setName] =
               (setCounts[setName] ?? 0) + 1;
           });

           const activeSets: string[] = [];

           Object.entries(setCounts).forEach(
             ([setName, count]) => {
               const pieces = runeSetPieces[setName];

               if (!pieces) {
                 return;
               }

               const completeSets = Math.floor(
                 count / pieces
               );

               for (let i = 0; i < completeSets; i++) {
                 activeSets.push(setName);
               }
             }
           );


console.log(
  "SETS",
  activeSets,
  config.requiredSets
);
         if (!passesSetFilters(activeSets, config)) {
           continue;
         }


        const slot2 =
          mainStatNames[rune2.pri_eff?.[0]] ?? "";

        const slot4 =
          mainStatNames[rune4.pri_eff?.[0]] ?? "";

        const slot6 =
          mainStatNames[rune6.pri_eff?.[0]] ?? "";

          if (
            !passesSlotFilters(
              buildRunes,
              config
            )
          ) {
            continue;
          }

          results.push({
            monsterId: monster.id,
            ehp,
            sets: activeSets,
            slot2,
            slot4,
            slot6,
            hp: stats.hp,
            atk: stats.atk,
            def: stats.def,
            spd: stats.spd,
            cr: stats.cr,
            cd: stats.cd,
            acc: stats.acc,
            res: stats.res,
           runeIds: buildRunes.map(
             (r) => r.rune_id
           ),
            score: stats.spd,
          });
        }
      }
    }}}}

    results.sort(
      (a, b) => b.score - a.score
    );

    return results.slice(0, 100);
}

export function optimizeMonster(
  monster: Monster,
  config: MonsterConfig
): OptimizationResult[] {

    const requiredSets = config.requiredSets.filter(Boolean);

    const candidateRunes = availableRunes.filter(
      (r) => r.occupied_id === 0
    );
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

console.log(
  "SETS",
  activeSets,
  config.requiredSets
);
    if (!passesSetFilters(activeSets, config)) {
      return [];
    }



    if (
      !passesSlotFilters(
        monster.runes ?? [],
        config
      )
    ) {
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

      ehp:
        stats.hp *
        (1140 + stats.def) /
        1000,

      sets: activeSets,

      slot2: "",
      slot4: "",
      slot6: "",

      runeIds: [],

      score: 0,
    },
  ];
}