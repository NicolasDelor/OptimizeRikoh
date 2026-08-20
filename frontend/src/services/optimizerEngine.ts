import type { Monster } from "../types/Monster";
import type { MonsterConfig } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import { runeSetNames, mainStatNames, runeSetPieces } from "../data/runeData";
import { getRuneBonus, getSetBonus, getStatValue } from "./statCalculator";
import { passesStatFilters, passesSetFilters, passesSlotFilters } from "./optimizerFilters";


let stopRequested = false;

export function requestOptimizationStop() {
  stopRequested = true;
}

export function resetOptimizationStop() {
  stopRequested = false;
}
function compareResults(
  a: OptimizationResult,
  b: OptimizationResult,
  focus?: string[]
) {
  const effectiveFocus = focus ?? ["spd"];


for (const stat of effectiveFocus) {
    if (stat === "efficiency") {
        const aValue = (a as any).efficiency ?? 0;
        const bValue = (b as any).efficiency ?? 0;

        if (aValue !== bValue) {
          return bValue - aValue;
        }

        continue;
      }
    const aValue = (a as any)[stat] ?? 0;
    const bValue = (b as any)[stat] ?? 0;

    if (aValue !== bValue) {
      return bValue - aValue;
    }
  }

  return 0;
}
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

const prioritizedSets = requiredSets.map((setName) => ({
  setName,
  pieces: runeSetPieces[setName] ?? 0,
}));

const requiredSetNames = new Set(
  prioritizedSets.map((s) => s.setName)
);

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
        requiredSetNames.has(
          runeSetNames[r.set_id]
        )
      )
    : candidateRunes;
    for (const rune of filteredCandidateRunes) {
      rune.cachedSpd = getRuneBonus([rune], 8);
      rune.cachedCr = getRuneBonus([rune], 9);
      rune.cachedCd = getRuneBonus([rune], 10);
      rune.cachedRes = getRuneBonus([rune], 11);
      rune.cachedAcc = getRuneBonus([rune], 12);

      rune.cachedHp = getStatValue(
        [rune],
        1,
        2,
        monster.baseHp ?? monster.hp,
        "hp"
      );

      rune.cachedAtk = getStatValue(
        [rune],
        3,
        4,
        monster.baseAtk ?? monster.atk,
        "atk"
      );

      rune.cachedDef = getStatValue(
        [rune],
        5,
        6,
        monster.baseDef ?? monster.def,
        "def"
      );
    }

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
          b.cachedSpd -
          a.cachedSpd
      )

    const slot3Runes = filteredCandidateRunes
      .filter(
        (r) =>
          r.slot_no === 3
      )
      .sort(
        (a, b) =>
          b.cachedSpd -
          a.cachedSpd
      )

    const slot5Runes = filteredCandidateRunes
      .filter(
        (r) =>
          r.slot_no === 5
      )
      .sort(
        (a, b) =>
          b.cachedSpd -
          a.cachedSpd
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
          { slot: 1, runes: slot1Runes },
          { slot: 2, runes: filteredSlot2Runes },
          { slot: 3, runes: slot3Runes },
          { slot: 4, runes: filteredSlot4Runes },
          { slot: 5, runes: slot5Runes },
          { slot: 6, runes: filteredSlot6Runes },
        ].sort((a, b) => a.runes.length - b.runes.length);

    const primaryFocus =
      config.focus?.[0] ?? "spd";

    const getFocusValue = (
      rune: any
    ) => {
      switch (primaryFocus) {
        case "hp":
          return rune.cachedHp;

        case "atk":
          return rune.cachedAtk;

        case "def":
          return rune.cachedDef;

        case "cr":
          return rune.cachedCr;

        case "cd":
          return rune.cachedCd;

        case "acc":
          return rune.cachedAcc;

        case "res":
          return rune.cachedRes;

        case "spd":
        default:
          return rune.cachedSpd;
      }
    };

    const runeSorter = (
      a: any,
      b: any
    ) => {
      const aRequired =
        requiredSetNames.has(
          runeSetNames[a.set_id]
        );

      const bRequired =
        requiredSetNames.has(
          runeSetNames[b.set_id]
        );

      if (aRequired && !bRequired) return -1;
      if (!aRequired && bRequired) return 1;

      return (
        getFocusValue(b) -
        getFocusValue(a)
      );
    };

    for (const slot of slotRunes) {
      slot.runes.sort(runeSorter);
    }

    type PartialStats = {
      hp: number;
      atk: number;
      def: number;

      spd: number;
      cr: number;
      cd: number;
      acc: number;
      res: number;

      setSpd: number;
      setCr: number;
      setAcc: number;
      setRes: number;
    };

function getMaxStatForSlot(
  runes: any[],
  stat: keyof Pick<
    PartialStats,
    "spd" | "cr" | "cd" | "acc" | "res"
  >
) {
  return Math.max(
    ...runes.map((r) => {
      switch (stat) {
        case "spd":
          return r.cachedSpd;
        case "cr":
          return r.cachedCr;
        case "cd":
          return r.cachedCd;
        case "acc":
          return r.cachedAcc;
        case "res":
          return r.cachedRes;
      default:
        return 0;
      }
    }),
    0
  );
}

    const maxSwiftBonus =
    Math.floor((monster.baseSpd ?? monster.spd) * 0.25);

    function canStillReachMinimums(
    currentStats: PartialStats,
    remainingMax: PartialStats,
    config: MonsterConfig
    ) {

      return !(
        (config.stats.spdMin !== undefined &&
          currentStats.spd +
            remainingMax.spd +
            maxSwiftBonus <
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
        hp: 0,
        atk: 0,
        def: 0,

        spd: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot.runes, "spd"),
            0
          ),

        cr: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot.runes, "cr"),
            0
          ),

        cd: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot.runes, "cd"),
            0
          ),

        acc: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot.runes, "acc"),
            0
          ),

        res: slotRunes
          .slice(index + 1)
          .reduce(
            (sum, slot) =>
              sum +
              getMaxStatForSlot(slot.runes, "res"),
            0
          ),

        setSpd: 0,
        setCr: 0,
        setAcc: 0,
        setRes: 0,
      }));

/*
    * Vérifie si la branche courante peut encore satisfaire
    * les sets demandés.
    *
    * Exemple : Set requis : Violent (4 pièces)
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
    let statFilterTime = 0;
    let setFilterTime = 0;
    let slotFilterTime = 0;
    let pruned = 0;
    let explored = 0;




function addRuneStats(
  stats: PartialStats,
  rune: any
): PartialStats {
  return {
    hp: stats.hp + rune.cachedHp,
    atk: stats.atk + rune.cachedAtk,
    def: stats.def + rune.cachedDef,

    spd: stats.spd + rune.cachedSpd,
    cr: stats.cr + rune.cachedCr,
    cd: stats.cd + rune.cachedCd,
    acc: stats.acc + rune.cachedAcc,
    res: stats.res + rune.cachedRes,

    setSpd: stats.setSpd,
    setCr: stats.setCr,
    setAcc: stats.setAcc,
    setRes: stats.setRes,
  };
}

const recursionCalls = { value: 0 };

function explore(
  slotIndex: number,
  buildRunes: any[],
  setCounts: Record<string, number>,
  partialStats: PartialStats,
  usedRuneIds: Set<number>
) {
    recursionCalls.value++;
    if (stopRequested) {
    return;
    }

  if (slotIndex === slotRunes.length) {
    const stats = {

      hp:
        monster.hp +
        partialStats.hp,

      atk:
        monster.atk +
        partialStats.atk,

      def:
        monster.def +
        partialStats.def,

      spd:
        monster.spd +
        partialStats.spd +
        partialStats.setSpd,

      cr:
        monster.cr +
        partialStats.cr +
        partialStats.setCr,

      cd:
        monster.cd +
        partialStats.cd,

      acc:
        monster.acc +
        partialStats.acc +
        partialStats.setAcc,

      res:
        monster.res +
        partialStats.res +
        partialStats.setRes,
    };

    const statFilterStart = performance.now();

    const passesStats =
      passesStatFilters(stats, config);

    statFilterTime +=
      performance.now() - statFilterStart;

    if (!passesStats)
      return;

    const activeSets: string[] = [];

    for (const setName in setCounts) {
      const count = setCounts[setName];

      const pieces = runeSetPieces[setName];

      if (!pieces) continue;

      const completeSets =
        Math.floor(count / pieces);

      for (let i = 0; i < completeSets; i++) {
        activeSets.push(setName);
      }
    }

    const setFilterStart = performance.now();

    const passesSets =
      passesSetFilters(activeSets, config);

    setFilterTime +=
      performance.now() - setFilterStart;

    if (!passesSets)
      return;

    const slotFilterStart = performance.now();

    const passesSlots =
      passesSlotFilters(buildRunes, config);

    slotFilterTime +=
      performance.now() - slotFilterStart;

    if (!passesSlots)
      return;
explored++;

    if (results.length >= 10000) {
      stopRequested = true;
      return;
    }

const ehp =
  stats.hp *
  (1140 + stats.def) /
  1000;

const score =
  stats.spd * 10 +
  stats.acc * 5 +
  ehp / 1000;

const efficiency =
  stats.spd +
  stats.cr +
  stats.cd +
  stats.acc +
  stats.res;
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

      ehp,
      efficiency,

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

      runeIds: [
        buildRunes[0].rune_id,
        buildRunes[1].rune_id,
        buildRunes[2].rune_id,
        buildRunes[3].rune_id,
        buildRunes[4].rune_id,
        buildRunes[5].rune_id,
      ],

      score,
    });

    return;
  }

  for (const rune of slotRunes[slotIndex].runes) {
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
    buildRunes[
      slotRunes[slotIndex].slot - 1
    ] = rune;
    usedRuneIds.add(rune.rune_id);

    const setName =
      runeSetNames[rune.set_id];

    if (setName) {
      setCounts[setName] =
        (setCounts[setName] ?? 0) + 1;
    }

    const nextStats =
      addRuneStats(
        partialStats,
        rune
      );

        const pieces =
          runeSetPieces[setName];

        if (
          setName &&
          pieces &&
          setCounts[setName] % pieces === 0
        ) {
          const setBonusRunes =
            buildRunes.filter(Boolean);

          nextStats.setSpd +=
            getSetBonus(setBonusRunes, "spd") -
            partialStats.setSpd;

          nextStats.setCr +=
            getSetBonus(setBonusRunes, "cr") -
            partialStats.setCr;

          nextStats.setAcc +=
            getSetBonus(setBonusRunes, "acc") -
            partialStats.setAcc;

          nextStats.setRes +=
            getSetBonus(setBonusRunes, "res") -
            partialStats.setRes;
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
    continue;
}

    if (
      !canStillReachMinimums(
        {
          hp:
            monster.hp +
            nextStats.hp,

          atk:
            monster.atk +
            nextStats.atk,

          def:
            monster.def +
            nextStats.def,

          spd:
            monster.spd +
            nextStats.spd +
            nextStats.setSpd,

          cr:
            monster.cr +
            nextStats.cr +
            nextStats.setCr,

          cd:
            monster.cd +
            nextStats.cd,

          acc:
            monster.acc +
            nextStats.acc +
            nextStats.setAcc,

          res:
            monster.res +
            nextStats.res +
            nextStats.setRes,

          setSpd: nextStats.setSpd,
          setCr: nextStats.setCr,
          setAcc: nextStats.setAcc,
          setRes: nextStats.setRes,
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
            continue;
    }

    if (
      nextStats.setSpd !== partialStats.setSpd ||
      nextStats.setCr !== partialStats.setCr ||
      nextStats.setAcc !== partialStats.setAcc ||
      nextStats.setRes !== partialStats.setRes
    ) {
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
const theoreticalCombinations =
  slotRunes.reduce(
    (total, slot) => total * slot.runes.length,
    1
  );


console.log(
  "COMBINATIONS BEFORE",
  theoreticalCombinations
);
explore(
  0,
  new Array(6),
  {},
  {
    hp: 0,
    atk: 0,
    def: 0,

    spd: 0,
    cr: 0,
    cd: 0,
    acc: 0,
    res: 0,

    setSpd: 0,
    setCr: 0,
    setAcc: 0,
    setRes: 0,
  },
  new Set<number>()
);


console.log(
  "THEORETICAL",
  theoreticalCombinations
);

console.log(
  "VISITED",
  recursionCalls.value
);

console.log(
  "EXPLORED",
  explored
);

console.log(
  "PRUNED",
  pruned
);

console.log(
  "REDUCED VS THEORETICAL",
  (
    (1 - recursionCalls.value / theoreticalCombinations) *
    100
  ).toFixed(6) + "%"
);
    results.sort(
      (a, b) =>
        compareResults(
          a,
          b,
          config.focus
        )
    );

console.log(
  "STAT FILTER TIME",
  statFilterTime.toFixed(2),
  "ms"
);

console.log(
  "SET FILTER TIME",
  setFilterTime.toFixed(2),
  "ms"
);

console.log(
  "SLOT FILTER TIME",
  slotFilterTime.toFixed(2),
  "ms"
);

console.log("OPTIMIZATION FINISHED");
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
    const ehp =
      stats.hp *
      (1140 + stats.def) /
      1000;

      const efficiency =
        stats.spd +
        stats.cr +
        stats.cd +
        stats.acc +
        stats.res;



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

      ehp,
      efficiency,

      sets: activeSets,

      slot2: "",
      slot4: "",
      slot6: "",

      runeIds: [],

      score: 0,
    },
  ];
}