export type RuneSetName =
    | "Fatal"
    | "Energy"
    | "Swift"
    | "Blade"
    | "Rage"
    | "Focus"
    | "Endure"
    | "Guard"
    | "Despair"
    | "Vampire"
    | "Violent"
    | "Nemesis"
    | "Will"
    | "Shield"
    | "Revenge"
    | "Destroy"
    | "Fight"
    | "Determination"
    | "Enhance"
    | "Accuracy"
    | "Tolerance"
    | "Seal"
    | "Intangible";

export type MainStatName =
    | "HP Flat"
    | "HP%"
    | "ATK Flat"
    | "ATK%"
    | "DEF Flat"
    | "DEF%"
    | "SPD"
    | "CR"
    | "CD"
    | "RES"
    | "ACC";

export type SetBonusStat =
    | "hp"
    | "atk"
    | "def"
    | "spd"
    | "cr"
    | "cd"
    | "acc"
    | "res";

export interface RuneSetDefinition {
    id: number;
    name: RuneSetName;
    pieces: number;
    bonusStat?: SetBonusStat;
    bonusValue?: number;
    bonusIsPercent?: boolean;
}

export const runeSetDefinitions: readonly RuneSetDefinition[] = [
    {
        id: 1,
        name: "Fatal",
        pieces: 4,
        bonusStat: "atk",
        bonusValue: 35,
        bonusIsPercent: true,
    },
    {
        id: 2,
        name: "Energy",
        pieces: 2,
        bonusStat: "hp",
        bonusValue: 15,
        bonusIsPercent: true,
    },
    {
        id: 3,
        name: "Swift",
        pieces: 4,
        bonusStat: "spd",
        bonusValue: 25,
        bonusIsPercent: true,
    },
    {
        id: 4,
        name: "Blade",
        pieces: 2,
        bonusStat: "cr",
        bonusValue: 12,
        bonusIsPercent: false,
    },
    {
        id: 5,
        name: "Rage",
        pieces: 4,
        bonusStat: "cd",
        bonusValue: 40,
        bonusIsPercent: false,
    },
    {
        id: 6,
        name: "Focus",
        pieces: 2,
        bonusStat: "acc",
        bonusValue: 20,
        bonusIsPercent: false,
    },
    {
        id: 7,
        name: "Endure",
        pieces: 2,
        bonusStat: "res",
        bonusValue: 20,
        bonusIsPercent: false,
    },
    {
        id: 8,
        name: "Guard",
        pieces: 2,
        bonusStat: "def",
        bonusValue: 15,
        bonusIsPercent: true,
    },
    {
        id: 10,
        name: "Despair",
        pieces: 4,
    },
    {
        id: 11,
        name: "Vampire",
        pieces: 4,
    },
    {
        id: 13,
        name: "Violent",
        pieces: 4,
    },
    {
        id: 14,
        name: "Nemesis",
        pieces: 2,
    },
    {
        id: 15,
        name: "Will",
        pieces: 2,
    },
    {
        id: 16,
        name: "Shield",
        pieces: 2,
    },
    {
        id: 17,
        name: "Revenge",
        pieces: 2,
    },
    {
        id: 18,
        name: "Destroy",
        pieces: 2,
    },
    {
        id: 19,
        name: "Fight",
        pieces: 2,
        bonusStat: "atk",
        bonusValue: 8,
        bonusIsPercent: true,
    },
    {
        id: 20,
        name: "Determination",
        pieces: 2,
        bonusStat: "def",
        bonusValue: 8,
        bonusIsPercent: true,
    },
    {
        id: 21,
        name: "Enhance",
        pieces: 2,
        bonusStat: "hp",
        bonusValue: 8,
        bonusIsPercent: true,
    },
    {
        id: 22,
        name: "Accuracy",
        pieces: 2,
        bonusStat: "acc",
        bonusValue: 10,
        bonusIsPercent: false,
    },
    {
        id: 23,
        name: "Tolerance",
        pieces: 2,
        bonusStat: "res",
        bonusValue: 10,
        bonusIsPercent: false,
    },
    {
        id: 24,
        name: "Seal",
        pieces: 2,
    },
    {
        id: 25,
        name: "Intangible",
        pieces: 1,
    },
] as const;

export const runeSetNames: Readonly<Record<number, RuneSetName>> =
    Object.freeze(
        Object.fromEntries(
            runeSetDefinitions.map((definition) => [
                definition.id,
                definition.name,
            ])
        ) as Record<number, RuneSetName>
    );

export const runeSetIds: Readonly<Record<RuneSetName, number>> = Object.freeze(
    Object.fromEntries(
        runeSetDefinitions.map((definition) => [
            definition.name,
            definition.id,
        ])
    ) as Record<RuneSetName, number>
);

export const runeSetPieces: Readonly<Record<RuneSetName, number>> =
    Object.freeze(
        Object.fromEntries(
            runeSetDefinitions.map((definition) => [
                definition.name,
                definition.pieces,
            ])
        ) as Record<RuneSetName, number>
    );

export const runeSetDefinitionsById: Readonly<
    Record<number, RuneSetDefinition>
> = Object.freeze(
    Object.fromEntries(
        runeSetDefinitions.map((definition) => [
            definition.id,
            definition,
        ])
    ) as Record<number, RuneSetDefinition>
);

export const runeSetDefinitionsByName: Readonly<
    Record<RuneSetName, RuneSetDefinition>
> = Object.freeze(
    Object.fromEntries(
        runeSetDefinitions.map((definition) => [
            definition.name,
            definition,
        ])
    ) as Record<RuneSetName, RuneSetDefinition>
);

export const mainStatNames: Readonly<Record<number, MainStatName>> =
    Object.freeze({
        1: "HP Flat",
        2: "HP%",
        3: "ATK Flat",
        4: "ATK%",
        5: "DEF Flat",
        6: "DEF%",
        8: "SPD",
        9: "CR",
        10: "CD",
        11: "RES",
        12: "ACC",
    });

export const mainStatIds: Readonly<Record<MainStatName, number>> =
    Object.freeze({
        "HP Flat": 1,
        "HP%": 2,
        "ATK Flat": 3,
        "ATK%": 4,
        "DEF Flat": 5,
        "DEF%": 6,
        SPD: 8,
        CR: 9,
        CD: 10,
        RES: 11,
        ACC: 12,
    });

export function getRuneSetName(setId: number): RuneSetName | undefined {
    return runeSetNames[setId];
}

export function getRuneSetId(setName: string): number | undefined {
    return runeSetIds[setName as RuneSetName];
}

export function getRuneSetPieces(setName: string): number | undefined {
    return runeSetPieces[setName as RuneSetName];
}

export function getMainStatName(
    statId: number
): MainStatName | undefined {
    return mainStatNames[statId];
}