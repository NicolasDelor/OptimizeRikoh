import { runeSetPieces } from "../data/runeData";

export interface SetPattern {
  required: Record<string, number>;
  intangible: number;
}

export function generateSetPatterns(requiredSets: string[]) {
  const patterns: SetPattern[] = [];

  const requiredCounts: Record<string, number> = {};

  for (const set of requiredSets) {
    requiredCounts[set] = (requiredCounts[set] ?? 0) + 1;
  }

  const basePattern: SetPattern = {
    required: {},
    intangible: 0,
  };

  for (const [setName, count] of Object.entries(requiredCounts)) {
    const pieces = runeSetPieces[setName] ?? 0;

    basePattern.required[setName] = pieces * count;
  }

  patterns.push(basePattern);

  for (const [setName, piecesRequired] of Object.entries(
    basePattern.required
  )) {
    for (let missing = 1; missing < piecesRequired; missing++) {
      patterns.push({
        required: {
          ...basePattern.required,
          [setName]: piecesRequired - missing,
        },
        intangible: missing,
      });
    }
  }

  return patterns.filter((p) => {
    const used =
      Object.values(p.required).reduce((a, b) => a + b, 0) + p.intangible;

    return used <= 6;
  });
}
