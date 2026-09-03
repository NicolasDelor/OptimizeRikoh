import type { Monster } from "../types/Monster";
import type { MonsterConfig } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import { runeSetNames, mainStatNames, runeSetPieces } from "../data/runeData";
import { getRuneBonus, getSetBonus, getStatValue } from "./statCalculator";
import {
  passesStatFilters,
  passesSetFilters,
  passesSlotFilters,
} from "./optimizerFilters";
import { analyzeSearchSpace } from "./searchSpaceAnalyzer";

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
  availableRunes: any[],
  onProgress?: (progress: {
    explored: number;
    pruned: number;
    total: number;
  }) => void
): {
  results: OptimizationResult[];
  totalBuilds: number;
} {
  console.log("START MONSTER", monster.name, "STOP", stopRequested);
  const candidateRunes = availableRunes;

  console.log("INTANGIBLE", runeSetNames[25], runeSetPieces["Intangible"]);

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

  const requiredSets = [
    ...(config.requiredSet1 ?? []),
    ...(config.requiredSet2 ?? []),
    ...(config.requiredSet3 ?? []),
  ].filter(Boolean);

  const prioritizedSets = requiredSets.map((setName) => ({
    setName,
    pieces: runeSetPieces[setName] ?? 0,
  }));

  const requiredSetNames = new Set(prioritizedSets.map((s) => s.setName));

  const requiredCounts: Record<string, number> = {};

  for (const set of requiredSets) {
    requiredCounts[set] = (requiredCounts[set] ?? 0) + 1;
  }

  const requiredPieces = requiredSets.reduce(
    (sum, setName) => sum + (runeSetPieces[setName] ?? 0),
    0
  );

  console.log("REQUIRED SETS", monster.name, requiredSets, requiredPieces);
  if (requiredPieces > 6) {
    console.log("REJECTED REQUIRED PIECES", monster.name, requiredPieces);

    return {
      results: [],
      totalBuilds: 0,
    };
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
      ? candidateRunes.filter(
          (r) =>
            requiredSetNames.has(runeSetNames[r.set_id]) ||
            runeSetNames[r.set_id] === "Intangible"
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

  const slot2Runes = filteredCandidateRunes.filter((r) => r.slot_no === 2);

  const slot4Runes = filteredCandidateRunes.filter((r) => r.slot_no === 4);

  const slot6Runes = filteredCandidateRunes.filter((r) => r.slot_no === 6);

  const slot1Runes = filteredCandidateRunes
    .filter((r) => r.slot_no === 1)
    .sort((a, b) => b.cachedSpd - a.cachedSpd);

  const slot3Runes = filteredCandidateRunes
    .filter((r) => r.slot_no === 3)
    .sort((a, b) => b.cachedSpd - a.cachedSpd);

  const slot5Runes = filteredCandidateRunes
    .filter((r) => r.slot_no === 5)
    .sort((a, b) => b.cachedSpd - a.cachedSpd);

  const filteredSlot2Runes =
    config.slot2MainStats.length > 0
      ? slot2Runes.filter((r) =>
          config.slot2MainStats.includes(mainStatNames[r.pri_eff?.[0]])
        )
      : slot2Runes;

  const filteredSlot4Runes =
    config.slot4MainStats.length > 0
      ? slot4Runes.filter((r) =>
          config.slot4MainStats.includes(mainStatNames[r.pri_eff?.[0]])
        )
      : slot4Runes;

  const filteredSlot6Runes =
    config.slot6MainStats.length > 0
      ? slot6Runes.filter((r) =>
          config.slot6MainStats.includes(mainStatNames[r.pri_eff?.[0]])
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

  const preAnalysis = analyzeSearchSpace(monster, config, slotRunes);

  console.log("PRE ANALYSIS", monster.name, preAnalysis);

  if (!preAnalysis.possible) {
    return {
      results: [],
      totalBuilds: 0,
    };
  }

  console.log("PRE ANALYSIS", preAnalysis);

  const primaryFocus = config.focus?.[0] ?? "spd";

  const getFocusValue = (rune: any) => {
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

  const runeSorter = (a: any, b: any) => {
    const aRequired = requiredSetNames.has(runeSetNames[a.set_id]);

    const bRequired = requiredSetNames.has(runeSetNames[b.set_id]);

    if (aRequired && !bRequired) return -1;
    if (!aRequired && bRequired) return 1;

    return getFocusValue(b) - getFocusValue(a);
  };

  for (const slot of slotRunes) {
    slot.runes.sort(runeSorter);
  }

  function filterDominatedRunes(runes: any[]) {
    return runes.filter((candidate, index) => {
      return !runes.some((other, otherIndex) => {
        if (index === otherIndex) {
          return false;
        }

        return (
          (other.cachedHp ?? 0) >= (candidate.cachedHp ?? 0) &&
          (other.cachedAtk ?? 0) >= (candidate.cachedAtk ?? 0) &&
          (other.cachedDef ?? 0) >= (candidate.cachedDef ?? 0) &&
          (other.cachedSpd ?? 0) >= (candidate.cachedSpd ?? 0) &&
          (other.cachedCr ?? 0) >= (candidate.cachedCr ?? 0) &&
          (other.cachedCd ?? 0) >= (candidate.cachedCd ?? 0) &&
          (other.cachedAcc ?? 0) >= (candidate.cachedAcc ?? 0) &&
          (other.cachedRes ?? 0) >= (candidate.cachedRes ?? 0) &&
          ((other.cachedHp ?? 0) > (candidate.cachedHp ?? 0) ||
            (other.cachedAtk ?? 0) > (candidate.cachedAtk ?? 0) ||
            (other.cachedDef ?? 0) > (candidate.cachedDef ?? 0) ||
            (other.cachedSpd ?? 0) > (candidate.cachedSpd ?? 0) ||
            (other.cachedCr ?? 0) > (candidate.cachedCr ?? 0) ||
            (other.cachedCd ?? 0) > (candidate.cachedCd ?? 0) ||
            (other.cachedAcc ?? 0) > (candidate.cachedAcc ?? 0) ||
            (other.cachedRes ?? 0) > (candidate.cachedRes ?? 0))
        );
      });
    });
  }

  for (const slot of slotRunes) {
    const before = slot.runes.length;

    slot.runes = filterDominatedRunes(slot.runes);

    console.log(
      `SLOT ${slot.slot} DOMINANCE FILTER : ${before} -> ${slot.runes.length}`
    );
  }
  const searchDepth = config.searchDepth ?? 10;

  for (const slot of slotRunes) {
    if (slot.runes.length > searchDepth) {
      console.log(
        "SLOT",
        slot.slot,
        "TOP RUNES",
        slot.runes.slice(0, 5).map((r) => ({
          runeId: r.rune_id,
          swopId: r.swopId,
          set: runeSetNames[r.set_id],
          spd: r.cachedSpd,
          hp: r.cachedHp,
          atk: r.cachedAtk,
          def: r.cachedDef,
        }))
      );

      console.log(
        `SEARCH DEPTH SLOT ${slot.slot} : ${slot.runes.length} -> ${searchDepth}`
      );

      slot.runes = slot.runes.slice(0, searchDepth);
    }
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
    stat: keyof Pick<PartialStats, "spd" | "cr" | "cd" | "acc" | "res">
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

  const maxSwiftBonus = Math.ceil((monster.baseSpd ?? monster.spd) * 0.25);

  const maxEnergyBonus = Math.ceil((monster.baseHp ?? monster.hp) * 0.15);

  const maxFatalBonus = Math.ceil((monster.baseAtk ?? monster.atk) * 0.35);

  const maxGuardBonus = Math.ceil((monster.baseDef ?? monster.def) * 0.15);

  const maxBladeBonus = requiredSets.filter((s) => s === "Blade").length * 12;

  const maxFocusBonus = requiredSets.filter((s) => s === "Focus").length * 20;

  const maxEndureBonus = requiredSets.filter((s) => s === "Endure").length * 20;

  const maxRageBonus = requiredSets.filter((s) => s === "Rage").length * 40;

  const maxFightBonus =
    Math.ceil((monster.baseAtk ?? monster.atk) * 0.08) *
    requiredSets.filter((s) => s === "Fight").length;

  const maxDeterminationBonus =
    Math.ceil((monster.baseDef ?? monster.def) * 0.08) *
    requiredSets.filter((s) => s === "Determination").length;

  const maxEnhanceBonus =
    Math.ceil((monster.baseHp ?? monster.hp) * 0.08) *
    requiredSets.filter((s) => s === "Enhance").length;

  const maxAccuracyBonus =
    requiredSets.filter((s) => s === "Accuracy").length * 10;

  const maxToleranceBonus =
    requiredSets.filter((s) => s === "Tolerance").length * 10;

  function canStillReachMinimums(
    currentStats: PartialStats,
    remainingMax: PartialStats,
    config: MonsterConfig
  ) {
    const hpPotential =
      currentStats.hp + remainingMax.hp + maxEnergyBonus + maxEnhanceBonus;

    const atkPotential =
      currentStats.atk + remainingMax.atk + maxFatalBonus + maxFightBonus;

    const defPotential =
      currentStats.def +
      remainingMax.def +
      maxGuardBonus +
      maxDeterminationBonus;

    const spdPotential = currentStats.spd + remainingMax.spd + maxSwiftBonus;

    const crPotential = currentStats.cr + remainingMax.cr + maxBladeBonus;

    const cdPotential = currentStats.cd + remainingMax.cd + maxRageBonus;

    const accPotential =
      currentStats.acc + remainingMax.acc + maxFocusBonus + maxAccuracyBonus;

    const resPotential =
      currentStats.res + remainingMax.res + maxEndureBonus + maxToleranceBonus;

    return !(
      (config.stats.hpMin !== undefined &&
        Math.round(hpPotential) < config.stats.hpMin) ||
      (config.stats.atkMin !== undefined &&
        Math.round(atkPotential) < config.stats.atkMin) ||
      (config.stats.defMin !== undefined &&
        Math.round(defPotential) < config.stats.defMin) ||
      (config.stats.spdMin !== undefined &&
        Math.round(spdPotential) < config.stats.spdMin) ||
      (config.stats.crMin !== undefined &&
        Math.round(crPotential) < config.stats.crMin) ||
      (config.stats.cdMin !== undefined &&
        Math.round(cdPotential) < config.stats.cdMin) ||
      (config.stats.accMin !== undefined &&
        Math.round(accPotential) < config.stats.accMin) ||
      (config.stats.resMin !== undefined &&
        Math.round(resPotential) < config.stats.resMin)
    );
  }

  const remainingMax: PartialStats[] = slotRunes.map((_, index) => ({
    hp: slotRunes
      .slice(index + 1)
      .reduce(
        (sum, slot) => sum + Math.max(...slot.runes.map((r) => r.cachedHp), 0),
        0
      ),

    atk: slotRunes
      .slice(index + 1)
      .reduce(
        (sum, slot) => sum + Math.max(...slot.runes.map((r) => r.cachedAtk), 0),
        0
      ),

    def: slotRunes
      .slice(index + 1)
      .reduce(
        (sum, slot) => sum + Math.max(...slot.runes.map((r) => r.cachedDef), 0),
        0
      ),

    spd: slotRunes
      .slice(index + 1)
      .reduce((sum, slot) => sum + getMaxStatForSlot(slot.runes, "spd"), 0),

    cr: slotRunes
      .slice(index + 1)
      .reduce((sum, slot) => sum + getMaxStatForSlot(slot.runes, "cr"), 0),

    cd: slotRunes
      .slice(index + 1)
      .reduce((sum, slot) => sum + getMaxStatForSlot(slot.runes, "cd"), 0),

    acc: slotRunes
      .slice(index + 1)
      .reduce((sum, slot) => sum + getMaxStatForSlot(slot.runes, "acc"), 0),

    res: slotRunes
      .slice(index + 1)
      .reduce((sum, slot) => sum + getMaxStatForSlot(slot.runes, "res"), 0),

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
    remainingSlots: number
  ) {
    setChecks++;

    const intangibleCount = setCounts["Intangible"] ?? 0;

    for (const [setName, requiredSetCount] of Object.entries(requiredCounts)) {
      const piecesPerSet = runeSetPieces[setName] ?? 0;

      const requiredPieces = requiredSetCount * piecesPerSet;

      const currentPieces = setCounts[setName] ?? 0;

      if (currentPieces + intangibleCount + remainingSlots < requiredPieces) {
        return false;
      }
    }

    return true;
  }

  const results: OptimizationResult[] = [];
  let totalBuilds = 0;
  let pruned = 0;
  let prunedSets = 0;
  let prunedMinimums = 0;
  let prunedStats = 0;
  let prunedScore = 0;
  let setChecks = 0;
  let explored = 0;
  let setBonusCalculations = 0;

  function addRuneStats(stats: PartialStats, rune: any): PartialStats {
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

  const RESULT_LIMIT = 100000;

  function explore(
    slotIndex: number,
    buildRunes: any[],
    setCounts: Record<string, number>,
    partialStats: PartialStats,
    usedRuneIds: Set<number>
  ) {
    recursionCalls.value++;
    if (results.length >= RESULT_LIMIT) {
      stopRequested = true;
      return;
    }
    if (recursionCalls.value % 10000 === 0) {
      console.log(
        "CALLS",
        recursionCalls.value,
        "BUILDS",
        totalBuilds,
        "EXPLORED",
        explored,
        "PRUNED",
        pruned
      );
    }
    if (stopRequested) {
      console.log("STOP REQUESTED", monster.name);
      return;
    }
    if (slotIndex === slotRunes.length) {
      totalBuilds++;

      if (totalBuilds % 100000 === 0) {
        console.log("TERMINAL BUILDS", totalBuilds);
      }

      const completedRunes = buildRunes.filter(Boolean);

      const stats = {
        hp:
          monster.hp +
          partialStats.hp +
          Math.round(
            ((monster.baseHp ?? monster.hp) *
              getSetBonus(completedRunes, "hp")) /
              100
          ),

        atk:
          monster.atk +
          partialStats.atk +
          Math.round(
            ((monster.baseAtk ?? monster.atk) *
              getSetBonus(completedRunes, "atk")) /
              100
          ),

        def:
          monster.def +
          partialStats.def +
          Math.round(
            ((monster.baseDef ?? monster.def) *
              getSetBonus(completedRunes, "def")) /
              100
          ),

        spd:
          monster.spd +
          partialStats.spd +
          Math.round(
            ((monster.baseSpd ?? monster.spd) * partialStats.setSpd) / 100
          ),

        cr: monster.cr + partialStats.cr + partialStats.setCr,

        cd: monster.cd + partialStats.cd,

        acc: monster.acc + partialStats.acc + partialStats.setAcc,

        res: monster.res + partialStats.res + partialStats.setRes,
      };

      const passesStats = passesStatFilters(stats, config);

      if (!passesStats) {
        prunedStats++;
        if (
          buildRunes[0]?.swopId === 1843 &&
          buildRunes[1]?.swopId === 1589 &&
          buildRunes[2]?.swopId === 2118 &&
          buildRunes[3]?.swopId === 3372 &&
          buildRunes[4]?.swopId === 2120 &&
          buildRunes[5]?.swopId === 3013
        ) {
          console.log("SWOP BUILD REJECTED BY STATS", stats);
        }

        return;
      }
      const activeSets: string[] = [];

      const intangibleCount = setCounts["Intangible"] ?? 0;
      let remainingIntangible = intangibleCount;

      const sets = Object.entries(setCounts)
        .filter(([setName]) => setName !== "Intangible")
        .map(([setName, count]) => {
          const pieces = runeSetPieces[setName];

          return {
            setName,
            count,
            pieces,
            remainder: pieces ? count % pieces : 0,
          };
        })
        .sort((a, b) => {
          const missingA =
            a.remainder === 0
              ? Number.MAX_SAFE_INTEGER
              : a.pieces - a.remainder;

          const missingB =
            b.remainder === 0
              ? Number.MAX_SAFE_INTEGER
              : b.pieces - b.remainder;

          return missingA - missingB;
        });

      for (const set of sets) {
        let effectiveCount = set.count;

        const missing = set.remainder === 0 ? 0 : set.pieces - set.remainder;

        if (missing > 0 && remainingIntangible >= missing) {
          effectiveCount += missing;
          remainingIntangible -= missing;
        }

        if (!set.pieces) {
          continue;
        }

        const completeSets = Math.floor(effectiveCount / set.pieces);

        for (let i = 0; i < completeSets; i++) {
          activeSets.push(set.setName);
        }
      }

      if (intangibleCount > 0) {
        activeSets.push("Intangible");
      }

      const passesSets = passesSetFilters(activeSets, config);

      if (!passesSets) return;

      explored++;

      if ((explored + pruned) % 10000 === 0) {
        onProgress?.({
          explored,
          pruned,
          total: totalPermutations,
        });
      }

      /* 5M */

      const ehp = (stats.hp * (1140 + stats.def)) / 1000;

      const score = stats.spd * 10 + stats.acc * 5 + ehp / 1000;

      const efficiency =
        stats.spd + stats.cr + stats.cd + stats.acc + stats.res;

      const result: OptimizationResult = {
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

        slot2: mainStatNames[buildRunes[1].pri_eff?.[0]] ?? "",

        slot4: mainStatNames[buildRunes[3].pri_eff?.[0]] ?? "",

        slot6: mainStatNames[buildRunes[5].pri_eff?.[0]] ?? "",

        runeIds: [
          buildRunes[0].swopId,
          buildRunes[1].swopId,
          buildRunes[2].swopId,
          buildRunes[3].swopId,
          buildRunes[4].swopId,
          buildRunes[5].swopId,
        ],

        score,
      };

      if (results.length >= RESULT_LIMIT) {
        results.sort((a, b) => compareResults(a, b, config.focus));

        const worst = results[results.length - 1];

        if (compareResults(result, worst, config.focus) >= 0) {
          return;
        }

        results.pop();
      }

      if (result.runeIds.join(",") === "1843,1589,2118,3372,2120,3013") {
        console.log("SWOP BUILD FOUND", result);
      }
      results.push(result);

      return;
    }

    for (const rune of slotRunes[slotIndex].runes) {
      if (stopRequested) {
        return;
      }
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
      buildRunes[slotRunes[slotIndex].slot - 1] = rune;

      usedRuneIds.add(rune.rune_id);

      const setName = runeSetNames[rune.set_id];

      if (
        requiredPieces >= 6 &&
        setName &&
        !requiredSetNames.has(setName) &&
        setName !== "Intangible"
      ) {
        usedRuneIds.delete(rune.rune_id);
        continue;
      }

      if (setName) {
        setCounts[setName] = (setCounts[setName] ?? 0) + 1;
      }

      const nextStats = addRuneStats(partialStats, rune);

      const pieces = runeSetPieces[setName];

      if (setName && pieces && setCounts[setName] % pieces === 0) {
        setBonusCalculations++;

        switch (setName) {
          case "Swift":
            nextStats.setSpd += 25;
            break;

          case "Blade":
            nextStats.setCr += 12;
            break;

          case "Focus":
            nextStats.setAcc += 20;
            break;

          case "Endure":
            nextStats.setRes += 20;
            break;
        }
      }

      const remainingSlots = slotRunes.length - (slotIndex + 1);

      if (
        buildRunes[0]?.swopId === 1843 &&
        buildRunes[1]?.swopId === 1589 &&
        buildRunes[2]?.swopId === 2118 &&
        buildRunes[3]?.swopId === 3372 &&
        buildRunes[4]?.swopId === 2120 &&
        buildRunes[5]?.swopId === 3013
      ) {
        console.log("SWOP REJECTED BY SETS");
      }

      if (!canStillCompleteSets(setCounts, remainingSlots)) {
        pruned++;
        prunedSets++;
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
        buildRunes[0]?.swopId === 1843 &&
        buildRunes[1]?.swopId === 1589 &&
        buildRunes[2]?.swopId === 2118 &&
        buildRunes[3]?.swopId === 3372 &&
        buildRunes[4]?.swopId === 2120 &&
        buildRunes[5]?.swopId === 3013
      ) {
        console.log("SWOP REJECTED BY MINIMUMS");
      }

      if (
        !canStillReachMinimums(
          {
            hp: monster.hp + nextStats.hp,

            atk: monster.atk + nextStats.atk,

            def: monster.def + nextStats.def,

            spd: monster.spd + nextStats.spd + nextStats.setSpd,

            cr: monster.cr + nextStats.cr + nextStats.setCr,

            cd: monster.cd + nextStats.cd,

            acc: monster.acc + nextStats.acc + nextStats.setAcc,

            res: monster.res + nextStats.res + nextStats.setRes,

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
        prunedMinimums++;

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

      if (results.length >= 100000) {
        const worst = results[results.length - 1];

        const maxPossibleScore =
          (monster.spd +
            nextStats.spd +
            remainingMax[slotIndex].spd +
            maxSwiftBonus) *
            10 +
          (monster.acc +
            nextStats.acc +
            remainingMax[slotIndex].acc +
            maxFocusBonus +
            maxAccuracyBonus) *
            5;

        if (maxPossibleScore < worst.score) {
          pruned++;
          prunedScore++;

          if (setName) {
            setCounts[setName]--;

            if (setCounts[setName] === 0) {
              delete setCounts[setName];
            }
          }

          usedRuneIds.delete(rune.rune_id);

          continue;
        }
      }

      explore(slotIndex + 1, buildRunes, setCounts, nextStats, usedRuneIds);

      if (stopRequested) {
        return;
      }

      if (setName) {
        setCounts[setName]--;

        if (setCounts[setName] === 0) {
          delete setCounts[setName];
        }
      }
      usedRuneIds.delete(rune.rune_id);
    }
  }

  const totalPermutations = slotRunes.reduce(
    (total, slot) => total * slot.runes.length,
    1
  );

  console.log(
    "SLOT SUMMARY",
    slotRunes.map((slot) => ({
      slot: slot.slot,
      count: slot.runes.length,
      focus: primaryFocus,
      bestRune: slot.runes[0]
        ? {
            swopId: slot.runes[0].swopId,
            set: runeSetNames[slot.runes[0].set_id],
            spd: slot.runes[0].cachedSpd,
          }
        : null,
    }))
  );

  console.log("TOTAL_PERMUTATIONS", totalPermutations);
  console.log("BEFORE EXPLORE", monster.name, "STOP", stopRequested);
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
    "AFTER EXPLORE",
    monster.name,
    "RESULTS",
    results.length,
    "BUILDS",
    totalBuilds
  );
  results.sort((a, b) => compareResults(a, b, config.focus));

  console.log(
    "SETS",
    prunedSets,
    "MINIMUMS",
    prunedMinimums,
    "SCORE",
    prunedScore,
    "FINAL_STATS",
    prunedStats
  );

  console.log("EXPLORED", explored, "PRUNED", pruned);

  console.log("SET_BONUS_CALCULATIONS", setBonusCalculations);

  console.log("SET_CHECKS", setChecks);

  return {
    results,
    totalBuilds,
  };
}
export function optimizeMonster(
  monster: Monster,
  config: MonsterConfig
): OptimizationResult[] {
  const runes = monster.runes ?? [];

  const stats = {
    hp:
      monster.hp +
      getStatValue(runes, 1, 2, monster.baseHp ?? monster.hp, "hp"),

    atk:
      monster.atk +
      getStatValue(runes, 3, 4, monster.baseAtk ?? monster.atk, "atk"),

    def:
      monster.def +
      getStatValue(runes, 5, 6, monster.baseDef ?? monster.def, "def"),

    spd: monster.spd + getRuneBonus(runes, 8) + getSetBonus(runes, "spd"),

    cr: monster.cr + getRuneBonus(runes, 9) + getSetBonus(runes, "cr"),

    cd: monster.cd + getRuneBonus(runes, 10),

    acc: monster.acc + getRuneBonus(runes, 12) + getSetBonus(runes, "acc"),

    res: monster.res + getRuneBonus(runes, 11) + getSetBonus(runes, "res"),
  };

  if (!passesStatFilters(stats, config)) {
    return [];
  }

  const activeSets =
    monster.runes?.map((r) => runeSetNames[r.set_id]).filter(Boolean) ?? [];

  if (!passesSetFilters(activeSets, config)) {
    return [];
  }

  if (!passesSlotFilters(monster.runes ?? [], config)) {
    return [];
  }

  const ehp = (stats.hp * (1140 + stats.def)) / 1000;

  const efficiency = stats.spd + stats.cr + stats.cd + stats.acc + stats.res;

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
