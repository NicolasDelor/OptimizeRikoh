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

const candidateRunes = availableRunes;

/*
 * Règles métier :
 *
 * - Violent / Any / Any
 *   => le build doit contenir AU MOINS un set Violent complet (4 pièces)
 *   => les 2 autres runes peuvent appartenir à n'importe quel set
 *
 * - Will / Any / Any
 *   => le build doit contenir AU MOINS un set Will complet (2 pièces)
 *   => les 4 autres runes peuvent appartenir à n'importe quel set
 *
 * - Violent / Will
 *   => les 6 slots sont déjà couverts (4 + 2)
 *   => seuls les sets Violent et Will sont autorisés
 *
 * - Si aucun set n'est demandé
 *   => tous les sets sont autorisés
 *
 * L'objectif est de ne jamais exclure une combinaison valide.
 */

const requiredSets = config.requiredSets.filter(Boolean);

const requiredPieces = requiredSets.reduce(
  (sum, setName) =>
    sum + (runeSetPieces[setName] ?? 0),
  0
);
if (requiredPieces > 6) {
  return [];
}

/*
 * Optimisation :
 *
 * Si les sets demandés occupent déjà les 6 slots
 * (ex: Violent + Will = 4 + 2),
 * alors toutes les autres runes peuvent être ignorées
 * dès le départ.
 *
 * En revanche :
 *
 * - Violent seul
 * - Will seul
 * - Violent + Any
 *
 * nécessitent de conserver toutes les runes,
 * car les slots restants peuvent être remplis
 * par n'importe quel autre set.
 */

const filteredCandidateRunes =
  requiredPieces >= 6
    ? candidateRunes.filter((r) =>
        requiredSets.includes(
          runeSetNames[r.set_id]
        )
      )
    : candidateRunes;


  const slot2Runes = filteredCandidateRunes.filter(
    (r) =>
      r.slot_no === 2
  );

  const slot4Runes = filteredCandidateRunes.filter(
    (r) =>
      r.slot_no === 4
  );

  const slot6Runes = filteredCandidateRunes.filter(
    (r) =>
      r.slot_no === 6
  );

    const slot1Runes = filteredCandidateRunes
      .filter(
        (r) =>
          r.slot_no === 1
      )
      .sort(
        (a, b) =>
          getRuneBonus([b], 8) -
          getRuneBonus([a], 8)
      )

    const slot3Runes = filteredCandidateRunes
      .filter(
        (r) =>
          r.slot_no === 3
      )
      .sort(
        (a, b) =>
          getRuneBonus([b], 8) -
          getRuneBonus([a], 8)
      )

    const slot5Runes = filteredCandidateRunes
      .filter(
        (r) =>
          r.slot_no === 5
      )
      .sort(
        (a, b) =>
          getRuneBonus([b], 8) -
          getRuneBonus([a], 8)
      )

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

        const slotRunes = [
          slot1Runes,
          filteredSlot2Runes,
          slot3Runes,
          filteredSlot4Runes,
          slot5Runes,
          filteredSlot6Runes,
        ];

    console.log(
      "SLOTS",
      slotRunes.map(slot => slot.length)
    );

    type PartialStats = {
      spd: number;
      cr: number;
      cd: number;
      acc: number;
      res: number;
    };

function getRuneStat(
      rune: any,
      statType: number
    ) {
      return getRuneBonus(
        [rune],
        statType
      );
    }

function getMaxStatForSlot(
      runes: any[],
      statType: number
    ) {
      return Math.max(
        ...runes.map((r) =>
          getRuneStat(r, statType)
        ),
        0
      );
    }

    function canStillReachMinimums(
      currentStats: PartialStats,
      remainingMax: PartialStats,
      config: MonsterConfig
    ) {

      return !(
        (config.stats.spdMin !== undefined &&
          currentStats.spd + remainingMax.spd <
            config.stats.spdMin) ||

        (config.stats.crMin !== undefined &&
          currentStats.cr + remainingMax.cr <
            config.stats.crMin) ||

        (config.stats.cdMin !== undefined &&
          currentStats.cd + remainingMax.cd <
            config.stats.cdMin) ||

        (config.stats.accMin !== undefined &&
          currentStats.acc + remainingMax.acc <
            config.stats.accMin) ||

        (config.stats.resMin !== undefined &&
          currentStats.res + remainingMax.res <
            config.stats.resMin)
      );
    }

    const remainingMax: PartialStats[] =
      slotRunes.map((_, index) => ({
        spd: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot, 8),
            0
          ),

        cr: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot, 9),
            0
          ),

        cd: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot, 10),
            0
          ),

        acc: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot, 12),
            0
          ),

        res: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot, 11),
            0
          ),
      }));

/*
 * Vérifie si la branche courante peut encore satisfaire
 * les sets demandés.
 *
 * Exemple :
 *
 * Set requis : Violent (4 pièces)
 *
 * Build actuel :
 *   Violent = 1
 *   Slots restants = 2
 *
 * 1 + 2 = 3 < 4
 *
 * Impossible de terminer le set Violent.
 * La branche est donc abandonnée immédiatement.
 *
 * Cette optimisation ne supprime jamais une
 * combinaison valide.
 *//*
    * Vérifie si la branche courante peut encore satisfaire
    * les sets demandés.
    *
    * Exemple :
    *
    * Set requis : Violent (4 pièces)
    *
    * Build actuel :
    *   Violent = 1
    *   Slots restants = 2
    *
    * 1 + 2 = 3 < 4
    *
    * Impossible de terminer le set Violent.
    * La branche est donc abandonnée immédiatement.
    *
    * Cette optimisation ne supprime jamais une
    * combinaison valide.
    */
  function canStillCompleteSets(
    setCounts: Record<string, number>,
    remainingSlots: number,
    requiredSets: string[]
  ) {
    for (const requiredSet of requiredSets.filter(Boolean)) {
      const piecesNeeded =
        runeSetPieces[requiredSet];

      const currentPieces =
        setCounts[requiredSet] ?? 0;

      if (
        currentPieces + remainingSlots <
        piecesNeeded
      ) {
        return false;
      }
    }

    return true;
  }

    const results: OptimizationResult[] = [];
    let pruned = 0;
    let explored = 0;




function addRuneStats(
  stats: PartialStats,
  rune: any
): PartialStats {
  return {
    spd: stats.spd + getRuneBonus([rune], 8),
    cr: stats.cr + getRuneBonus([rune], 9),
    cd: stats.cd + getRuneBonus([rune], 10),
    acc: stats.acc + getRuneBonus([rune], 12),
    res: stats.res + getRuneBonus([rune], 11),
  };
}


function explore(
  slotIndex: number,
  buildRunes: any[],
  setCounts: Record<string, number>,
  partialStats: PartialStats,
  usedRuneIds: Set<number>
) {
/*
 * Optimisation de performance.
 *
 * L'exploration s'arrête dès que 100 builds valides
 * ont été trouvés.
 *
 * Les résultats retournés sont les 100 premiers
 * builds trouvés puis triés par score.
 *
 * Ce mécanisme est très rapide mais ne garantit
 * pas d'obtenir les 100 meilleurs builds globaux.
 */
    if (results.length >= 100) {
    return;
    }

  if (slotIndex === slotRunes.length) {
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
        partialStats.spd +
        getSetBonus(buildRunes, "spd"),

      cr:
        monster.cr +
        partialStats.cr +
        getSetBonus(buildRunes, "cr"),

      cd:
        monster.cd +
        partialStats.cd,

      acc:
        monster.acc +
        partialStats.acc +
        getSetBonus(buildRunes, "acc"),

      res:
        monster.res +
        partialStats.res +
        getSetBonus(buildRunes, "res"),
    };

    if (!passesStatFilters(stats, config))
      return;

    const activeSets: string[] = [];

    Object.entries(setCounts).forEach(
      ([setName, count]) => {
        const pieces = runeSetPieces[setName];

        if (!pieces)
          return;

        const completeSets = Math.floor(
          count / pieces
        );

        for (let i = 0; i < completeSets; i++) {
          activeSets.push(setName);
        }
      }
    );

    if (!passesSetFilters(activeSets, config))
      return;

    if (!passesSlotFilters(buildRunes, config))
      return;
explored++;

    results.push({

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

      slot2:
        mainStatNames[
          buildRunes[1].pri_eff?.[0]
        ] ?? "",

      slot4:
        mainStatNames[
          buildRunes[3].pri_eff?.[0]
        ] ?? "",

      slot6:
        mainStatNames[
          buildRunes[5].pri_eff?.[0]
        ] ?? "",

      runeIds: buildRunes.map(
        (r) => r.rune_id
      ),

      score: stats.spd,
    });

    return;
  }

  for (const rune of slotRunes[slotIndex]) {
      /*
       * Une même rune ne peut pas être équipée
       * plusieurs fois sur un même monstre.
       *
       * On conserve la liste des runes déjà utilisées
       * afin d'éviter les builds invalides.
       */
      if (usedRuneIds.has(rune.rune_id)) {
        continue;
      }
    buildRunes.push(rune);
    usedRuneIds.add(rune.rune_id);

    const setName =
      runeSetNames[rune.set_id];

    if (setName) {
      setCounts[setName] =
        (setCounts[setName] ?? 0) + 1;
    }

const remainingSlots =
  slotRunes.length - (slotIndex + 1);

if (
  !canStillCompleteSets(
    setCounts,
    remainingSlots,
    requiredSets
  )
) {
  if (setName) {
    setCounts[setName]--;

    if (setCounts[setName] === 0) {
      delete setCounts[setName];
    }
  }

  usedRuneIds.delete(rune.rune_id);
  buildRunes.pop();
  continue;
}

    const nextStats =
      addRuneStats(
        partialStats,
        rune
      );

    if (
      !canStillReachMinimums(
        {
          spd:
            monster.spd +
            nextStats.spd,

          cr:
            monster.cr +
            nextStats.cr,

          cd:
            monster.cd +
            nextStats.cd,

          acc:
            monster.acc +
            nextStats.acc,

          res:
            monster.res +
            nextStats.res,
        },
        remainingMax[slotIndex],
        config
      )
    ) {
      pruned++;

      if (setName) {
        setCounts[setName]--;

        if (setCounts[setName] === 0) {
          delete setCounts[setName];
        }
      }

      usedRuneIds.delete(rune.rune_id);
      buildRunes.pop();
      continue;
    }

    explore(
      slotIndex + 1,
      buildRunes,
      setCounts,
      nextStats,
      usedRuneIds
    );

    if (setName) {
      setCounts[setName]--;

      if (setCounts[setName] === 0) {
        delete setCounts[setName];
      }
    }
    usedRuneIds.delete(rune.rune_id);
    buildRunes.pop();
  }
}

/*
 * Métrique de diagnostic.
 *
 * Permet d'estimer la taille théorique de
 * l'espace de recherche avant pruning :
 *
 * slot1 × slot2 × slot3 × slot4 × slot5 × slot6
 *
 * Si ce nombre devient énorme, il est normal
 * que le moteur ralentisse.
 */
console.log(
  "COMBINATIONS",
  slotRunes.reduce(
    (total, slot) => total * slot.length,
    1
  )
);
explore(
  0,
  [],
  {},
  {
    spd: 0,
    cr: 0,
    cd: 0,
    acc: 0,
    res: 0,
  },
  new Set<number>()

);
console.log(
  "EXPLORED",
  explored
);

console.log(
  "RESULTS",
  results.length
);

console.log(
  "PRUNED",
  pruned
);
    results.sort(
      (a, b) => b.score - a.score
    );

    return results.slice(0, 100);
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
      return [];
    }


    const activeSets = monster.runes
      ?.map((r) => runeSetNames[r.set_id])
      .filter(Boolean) ?? [];

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