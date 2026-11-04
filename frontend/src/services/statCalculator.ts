import {
  runeSetDefinitionsByName,
  type RuneSetName,
  runeSetNames,
  runeSetPieces,
  type SetBonusStat,
} from "../data/runeData";
import type { Monster } from "../types/Monster";
import type { PreparedRune, RuneStats, SwexRune } from "../types/Rune";

export interface BuildStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  cr: number;
  cd: number;
  acc: number;
  res: number;
}

export interface BuildCalculation {
  stats: BuildStats;
  runeStats: RuneStats;
  activeSets: RuneSetName[];
  setBonuses: Record<SetBonusStat, number>;
  ehp: number;
  damage: number;
}

interface SetResolution {
  activeSets: RuneSetName[];
  usedIntangible: number;
}

const SET_BONUS_STATS: SetBonusStat[] = [
  "hp",
  "atk",
  "def",
  "spd",
  "cr",
  "cd",
  "acc",
  "res",
];

function createEmptyRuneStats(): RuneStats {
  return {
    hpFlat: 0,
    hpPercent: 0,
    atkFlat: 0,
    atkPercent: 0,
    defFlat: 0,
    defPercent: 0,
    spd: 0,
    cr: 0,
    cd: 0,
    acc: 0,
    res: 0,
  };
}

function createEmptySetBonuses(): Record<SetBonusStat, number> {
  return {
    hp: 0,
    atk: 0,
    def: 0,
    spd: 0,
    cr: 0,
    cd: 0,
    acc: 0,
    res: 0,
  };
}

function addRuneStats(target: RuneStats, source: RuneStats): void {
  target.hpFlat += source.hpFlat;
  target.hpPercent += source.hpPercent;
  target.atkFlat += source.atkFlat;
  target.atkPercent += source.atkPercent;
  target.defFlat += source.defFlat;
  target.defPercent += source.defPercent;
  target.spd += source.spd;
  target.cr += source.cr;
  target.cd += source.cd;
  target.acc += source.acc;
  target.res += source.res;
}

function readEffectValue(effect: unknown, expectedStatType: number): number {
  if (!Array.isArray(effect) || Number(effect[0]) !== expectedStatType) {
    return 0;
  }

  return Number(effect[1] ?? 0) + Number(effect[3] ?? 0);
}

function getRawRuneStat(rune: SwexRune, statType: number): number {
  let total = 0;

  total += readEffectValue(rune.pri_eff, statType);
  total += readEffectValue(rune.prefix_eff, statType);

  for (const effect of rune.sec_eff ?? []) {
    total += readEffectValue(effect, statType);
  }

  return total;
}

function countRuneSets(
  setNames: Array<RuneSetName | undefined>
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const setName of setNames) {
    if (!setName) {
      continue;
    }

    counts[setName] = (counts[setName] ?? 0) + 1;
  }

  return counts;
}

function compareSetResolutions(
  first: SetResolution,
  second: SetResolution
): number {
  if (first.activeSets.length !== second.activeSets.length) {
    return second.activeSets.length - first.activeSets.length;
  }

  if (first.usedIntangible !== second.usedIntangible) {
    return first.usedIntangible - second.usedIntangible;
  }

  return first.activeSets.join("|").localeCompare(second.activeSets.join("|"));
}

function resolveSetCombinations(
  setCounts: Record<string, number>
): SetResolution[] {
  const intangibleCount = setCounts.Intangible ?? 0;

  const regularSets = Object.entries(setCounts)
    .filter(([setName]) => setName !== "Intangible")
    .map(([setName, count]) => ({
      setName: setName as RuneSetName,
      count,
      pieces: runeSetPieces[setName as RuneSetName] ?? 0,
    }))
    .filter((set) => set.pieces > 0)
    .sort((first, second) => first.setName.localeCompare(second.setName));

  const resolutions: SetResolution[] = [];

  function explore(
    setIndex: number,
    remainingIntangible: number,
    activeSets: RuneSetName[]
  ): void {
    if (setIndex >= regularSets.length) {
      resolutions.push({
        activeSets: [...activeSets],
        usedIntangible: intangibleCount - remainingIntangible,
      });
      return;
    }

    const set = regularSets[setIndex];
    const maximumAssignedIntangible = Math.min(
      remainingIntangible,
      set.pieces - 1
    );

    for (
      let assignedIntangible = 0;
      assignedIntangible <= maximumAssignedIntangible;
      assignedIntangible++
    ) {
      const totalPieces = set.count + assignedIntangible;
      const completedSets = Math.floor(totalPieces / set.pieces);
      const nextActiveSets = [...activeSets];

      for (let index = 0; index < completedSets; index++) {
        nextActiveSets.push(set.setName);
      }

      explore(
        setIndex + 1,
        remainingIntangible - assignedIntangible,
        nextActiveSets
      );
    }
  }

  explore(0, intangibleCount, []);

  if (resolutions.length === 0) {
    return [{ activeSets: [], usedIntangible: 0 }];
  }

  const uniqueResolutions = new Map<string, SetResolution>();

  for (const resolution of resolutions) {
    const sortedActiveSets = [...resolution.activeSets].sort();
    const key = `${sortedActiveSets.join("|")}:${resolution.usedIntangible}`;

    if (!uniqueResolutions.has(key)) {
      uniqueResolutions.set(key, {
        activeSets: sortedActiveSets,
        usedIntangible: resolution.usedIntangible,
      });
    }
  }

  return [...uniqueResolutions.values()].sort(compareSetResolutions);
}

export function getPossibleActiveSetCombinations(
  runes: Array<PreparedRune | SwexRune>
): RuneSetName[][] {
  const setNames: Array<RuneSetName | undefined> = runes.map(
    (rune): RuneSetName | undefined => {
      if ("setName" in rune) {
        return typeof rune.setName === "string"
          ? (rune.setName as RuneSetName)
          : undefined;
      }

      return runeSetNames[Number(rune.set_id)];
    }
  );

  const counts = countRuneSets(setNames);

  return resolveSetCombinations(counts).map(
    (resolution) => resolution.activeSets
  );
}

export function getActiveSets(
  runes: Array<PreparedRune | SwexRune>
): RuneSetName[] {
  return getPossibleActiveSetCombinations(runes)[0] ?? [];
}

export function getSetBonusesFromActiveSets(
  activeSets: RuneSetName[]
): Record<SetBonusStat, number> {
  const bonuses = createEmptySetBonuses();

  for (const setName of activeSets) {
    const definition = runeSetDefinitionsByName[setName];

    if (
      !definition ||
      !definition.bonusStat ||
      definition.bonusValue === undefined
    ) {
      continue;
    }

    bonuses[definition.bonusStat] += definition.bonusValue;
  }

  return bonuses;
}

export function sumPreparedRuneStats(runes: PreparedRune[]): RuneStats {
  const total = createEmptyRuneStats();

  for (const rune of runes) {
    addRuneStats(total, rune.stats);
  }

  return total;
}

export function calculateBuildStats(
  monster: Monster,
  runes: PreparedRune[],
  activeSets: RuneSetName[] = getActiveSets(runes)
): BuildCalculation {
  const runeStats = sumPreparedRuneStats(runes);
  const setBonuses = getSetBonusesFromActiveSets(activeSets);

  const baseHp = monster.baseHp;
  const baseAtk = monster.baseAtk;
  const baseDef = monster.baseDef;
  const baseSpd = monster.baseSpd;

  const hp =
    monster.hp +
    runeStats.hpFlat +
    (baseHp * (runeStats.hpPercent + setBonuses.hp)) / 100;

  const atk =
    monster.atk +
    runeStats.atkFlat +
    (baseAtk * (runeStats.atkPercent + setBonuses.atk)) / 100;

  const def =
    monster.def +
    runeStats.defFlat +
    (baseDef * (runeStats.defPercent + setBonuses.def)) / 100;

  const spd = monster.spd + runeStats.spd + (baseSpd * setBonuses.spd) / 100;

  const cr = monster.cr + runeStats.cr + setBonuses.cr;
  const cd = monster.cd + runeStats.cd + setBonuses.cd;
  const acc = monster.acc + runeStats.acc + setBonuses.acc;
  const res = monster.res + runeStats.res + setBonuses.res;

  const stats: BuildStats = {
    hp,
    atk,
    def,
    spd,
    cr,
    cd,
    acc,
    res,
  };

  const ehp = (hp * (1140 + def)) / 1000;
  const effectiveCriticalRate = Math.min(100, Math.max(0, cr));
  const effectiveCriticalDamage = Math.max(0, cd);
  const damage =
    atk * (1 + (effectiveCriticalRate / 100) * (effectiveCriticalDamage / 100));

  return {
    stats,
    runeStats,
    activeSets,
    setBonuses,
    ehp,
    damage,
  };
}

export function getRuneBonus(runes: SwexRune[], statType: number): number {
  let total = 0;

  for (const rune of runes) {
    total += getRawRuneStat(rune, statType);
  }

  return total;
}

export function getSetBonus(runes: SwexRune[], stat: string): number {
  if (!SET_BONUS_STATS.includes(stat as SetBonusStat)) {
    return 0;
  }

  const activeSets = getActiveSets(runes);
  const bonuses = getSetBonusesFromActiveSets(activeSets);

  return bonuses[stat as SetBonusStat];
}

export function getStatValue(
  runes: SwexRune[],
  flatType: number,
  percentType: number,
  baseValue: number,
  statName: string
): number {
  const flatValue = getRuneBonus(runes, flatType);
  const percentValue = getRuneBonus(runes, percentType);
  const setPercentValue = getSetBonus(runes, statName);

  return flatValue + (baseValue * (percentValue + setPercentValue)) / 100;
}
