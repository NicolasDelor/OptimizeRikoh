import { runeSetNames, runeSetPieces } from "../data/runeData";

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

  let remainingIntangible = counts[25] ?? 0;

  function completeSet(count: number, pieces: number) {
    const complete = Math.floor(count / pieces);

    if (complete > 0) {
      return complete;
    }

    const missing = pieces - count;

    if (missing > 0 && remainingIntangible >= missing) {
      remainingIntangible -= missing;
      return 1;
    }

    return 0;
  }

  let bonus = 0;

  const fatal = completeSet(counts[1] ?? 0, 4);
  const energy = completeSet(counts[2] ?? 0, 2);
  const swift = completeSet(counts[3] ?? 0, 4);
  const blade = completeSet(counts[4] ?? 0, 2);
  const rage = completeSet(counts[5] ?? 0, 4);
  const focus = completeSet(counts[6] ?? 0, 2);
  const endure = completeSet(counts[7] ?? 0, 2);
  const guard = completeSet(counts[8] ?? 0, 2);

  const fight = completeSet(counts[19] ?? 0, 2);
  const determination = completeSet(counts[20] ?? 0, 2);
  const enhance = completeSet(counts[21] ?? 0, 2);
  const accuracy = completeSet(counts[22] ?? 0, 2);
  const tolerance = completeSet(counts[23] ?? 0, 2);

  switch (stat) {
    case "hp":
      bonus += energy * 15;
      bonus += enhance * 8;
      break;

    case "atk":
      bonus += fatal * 35;
      bonus += fight * 8;
      break;

    case "def":
      bonus += guard * 15;
      bonus += determination * 8;
      break;

    case "spd":
      bonus += swift * 25;
      break;

    case "cr":
      bonus += blade * 12;
      break;

    case "cd":
      bonus += rage * 40;
      break;

    case "acc":
      bonus += focus * 20;
      bonus += accuracy * 10;
      break;

    case "res":
      bonus += endure * 20;
      bonus += tolerance * 10;
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

    counts[setName] = (counts[setName] ?? 0) + 1;
  });

  const activeSets: string[] = [];

  let remainingIntangible = counts["Intangible"] ?? 0;

  Object.entries(counts).forEach(([setName, count]) => {
    if (setName === "Intangible") {
      return;
    }

    const pieces = runeSetPieces[setName];

    if (!pieces) {
      return;
    }

    let completeSets = Math.floor(count / pieces);

    if (completeSets === 0) {
      const missing = pieces - count;

      if (missing > 0 && remainingIntangible >= missing) {
        completeSets = 1;
        remainingIntangible -= missing;
      }
    }

    for (let i = 0; i < completeSets; i++) {
      activeSets.push(setName);
    }
  });

  if (
    (counts["Intangible"] ?? 0) > 0 &&
    remainingIntangible === counts["Intangible"]
  ) {
    activeSets.push("Intangible");
  }
  return activeSets;
}
