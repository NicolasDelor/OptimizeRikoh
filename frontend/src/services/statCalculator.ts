import {
  runeSetNames,
  runeSetPieces,
} from "../data/runeData";

export function getRuneBonus(runes: any[], statType: number) {
  let total = 0;

  runes.forEach((rune) => {
    const effects = [rune.pri_eff, rune.prefix_eff, ...(rune.sec_eff ?? [])];

    effects.forEach((effect: any) => {
      if (Array.isArray(effect) && effect[0] === statType) {
        total += Number(effect[1] ?? 0) + Number(effect[3] ?? 0);
      }
    });
  });

  return total;
}

export function getSetBonus(runes: any[], stat: string) {
  const counts: Record<number, number> = {};

  runes.forEach((rune) => {
    counts[rune.set_id] = (counts[rune.set_id] ?? 0) + 1;
  });

  let bonus = 0;

  const energy = Math.floor((counts[4] ?? 0) / 2);

  const guard = Math.floor((counts[8] ?? 0) / 2);

  const blade = Math.floor((counts[5] ?? 0) / 2);

  const focus = Math.floor((counts[6] ?? 0) / 2);

  const endure = Math.floor((counts[7] ?? 0) / 2);

  const fatal = Math.floor((counts[1] ?? 0) / 4);

  const swift = Math.floor((counts[3] ?? 0) / 4);

  switch (stat) {
    case "hp":
      bonus += energy * 15;
      break;

    case "atk":
      bonus += fatal * 35;
      break;

    case "def":
      bonus += guard * 15;
      break;

    case "spd":
      bonus += swift * 25;
      break;

    case "cr":
      bonus += blade * 12;
      break;

    case "acc":
      bonus += focus * 20;
      break;

    case "res":
      bonus += endure * 20;
      break;
  }

  return bonus;
}

export function getStatValue(
  runes: any[],
  flatType: number,
  percentType: number,
  baseValue: number,
  statName: string
) {
  const flat = getRuneBonus(runes, flatType);

  const percent = getRuneBonus(runes, percentType);

  const setPercent = getSetBonus(runes, statName);

  return Math.round(flat + (baseValue * (percent + setPercent)) / 100);
}
export function getActiveSets(runes: any[]) {
  const counts: Record<string, number> = {};

  runes.forEach((rune) => {
    const setName = runeSetNames[rune.set_id];

    if (!setName) {
      return;
    }

    counts[setName] =
      (counts[setName] ?? 0) + 1;
  });

  const activeSets: string[] = [];

  Object.entries(counts).forEach(
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

  return activeSets;
}


