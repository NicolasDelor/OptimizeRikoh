import {type RuneSetName, runeSetPieces,} from "../data/runeData";

export interface SetPattern {
    requiredPieces: Partial<Record<RuneSetName, number>>;
    intangiblePieces: number;
    occupiedSlots: number;
}

function countRequiredSets(
    requiredSets: readonly string[]
): Partial<Record<RuneSetName, number>> {
    const counts: Partial<Record<RuneSetName, number>> = {};

    for (const setName of requiredSets) {
        if (
            !setName ||
            setName === "Intangible" ||
            runeSetPieces[setName as RuneSetName] === undefined
        ) {
            continue;
        }

        const typedSetName = setName as RuneSetName;

        counts[typedSetName] = (counts[typedSetName] ?? 0) + 1;
    }

    return counts;
}

function createPatternKey(pattern: SetPattern): string {
    const requiredKey = Object.entries(pattern.requiredPieces)
        .filter(([, pieces]) => (pieces ?? 0) > 0)
        .sort(([setNameA], [setNameB]) =>
            setNameA.localeCompare(setNameB)
        )
        .map(([setName, pieces]) => `${setName}:${pieces}`)
        .join("|");

    return `${requiredKey}|Intangible:${pattern.intangiblePieces}`;
}

export function generateSetPatterns(
    requiredSets: readonly string[]
): SetPattern[] {
    const requiredCounts = countRequiredSets(requiredSets);

    const requirements = Object.entries(requiredCounts)
        .map(([setName, requiredSetCount]) => {
            const typedSetName = setName as RuneSetName;
            const piecesPerSet = runeSetPieces[typedSetName];

            return {
                setName: typedSetName,
                requiredSetCount: requiredSetCount ?? 0,
                piecesPerSet,
                totalPieces: piecesPerSet * (requiredSetCount ?? 0),
            };
        })
        .filter(
            (requirement) =>
                requirement.requiredSetCount > 0 &&
                requirement.piecesPerSet > 0
        )
        .sort((a, b) => a.setName.localeCompare(b.setName));

    if (requirements.length === 0) {
        return [
            {
                requiredPieces: {},
                intangiblePieces: 0,
                occupiedSlots: 0,
            },
        ];
    }

    const patterns: SetPattern[] = [];

    function explore(
        requirementIndex: number,
        requiredPieces: Partial<Record<RuneSetName, number>>,
        intangiblePieces: number
    ): void {
        if (requirementIndex >= requirements.length) {
            const regularPieces = Object.values(requiredPieces).reduce(
                (total, pieces) => total + (pieces ?? 0),
                0
            );

            const occupiedSlots = regularPieces + intangiblePieces;

            if (occupiedSlots <= 6) {
                patterns.push({
                    requiredPieces: {...requiredPieces},
                    intangiblePieces,
                    occupiedSlots,
                });
            }

            return;
        }

        const requirement = requirements[requirementIndex];

        /*
         * Une occurrence de set doit conserver au moins une rune
         * appartenant réellement à ce set.
         *
         * Exemple :
         * - Violent : de 4 Violent à 1 Violent + 3 Intangible
         * - Will : de 2 Will à 1 Will + 1 Intangible
         *
         * Pour plusieurs occurrences du même set, cette règle est
         * appliquée à chaque occurrence.
         */
        const maximumIntangibleForRequirement =
            requirement.requiredSetCount *
            (requirement.piecesPerSet - 1);

        for (
            let substitutedPieces = 0;
            substitutedPieces <= maximumIntangibleForRequirement;
            substitutedPieces++
        ) {
            const regularPieces =
                requirement.totalPieces - substitutedPieces;

            requiredPieces[requirement.setName] = regularPieces;

            explore(
                requirementIndex + 1,
                requiredPieces,
                intangiblePieces + substitutedPieces
            );
        }

        delete requiredPieces[requirement.setName];
    }

    explore(0, {}, 0);

    const uniquePatterns = new Map<string, SetPattern>();

    for (const pattern of patterns) {
        const key = createPatternKey(pattern);

        if (!uniquePatterns.has(key)) {
            uniquePatterns.set(key, pattern);
        }
    }

    return [...uniquePatterns.values()].sort((a, b) => {
        if (a.occupiedSlots !== b.occupiedSlots) {
            return a.occupiedSlots - b.occupiedSlots;
        }

        if (a.intangiblePieces !== b.intangiblePieces) {
            return a.intangiblePieces - b.intangiblePieces;
        }

        return createPatternKey(a).localeCompare(createPatternKey(b));
    });
}

export function patternCanStillBeCompleted(
    pattern: SetPattern,
    currentSetCounts: Readonly<Record<string, number>>,
    remainingSlots: number
): boolean {
    let missingRegularPieces = 0;

    for (const [setName, requiredPieces] of Object.entries(
        pattern.requiredPieces
    )) {
        const currentPieces = currentSetCounts[setName] ?? 0;

        missingRegularPieces += Math.max(
            0,
            (requiredPieces ?? 0) - currentPieces
        );
    }

    const currentIntangiblePieces =
        currentSetCounts.Intangible ?? 0;

    const missingIntangiblePieces = Math.max(
        0,
        pattern.intangiblePieces - currentIntangiblePieces
    );

    return (
        missingRegularPieces + missingIntangiblePieces <= remainingSlots
    );
}

export function anyPatternCanStillBeCompleted(
    patterns: readonly SetPattern[],
    currentSetCounts: Readonly<Record<string, number>>,
    remainingSlots: number
): boolean {
    return patterns.some((pattern) =>
        patternCanStillBeCompleted(
            pattern,
            currentSetCounts,
            remainingSlots
        )
    );
}