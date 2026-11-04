import type {Monster} from "../types/Monster";
import type {SwexRune} from "../types/Rune";

export type ImportMode = "NORMAL" | "RTA" | "SIEGE";

interface WorldArenaRuneEquip {
    occupied_id?: number;
    rune_id?: number;
}

interface SiegeEquippedUnit {
    unit_id?: number;
    rune_id_list?: number[];
}

interface SiegeDefenseDeck {
    equip?: SiegeEquippedUnit[];
}

interface SwexData {
    runes?: SwexRune[];
    unit_list?: Array<{
        unit_id?: number;
        runes?: SwexRune[];
    }>;
    world_arena_rune_equip_list?: WorldArenaRuneEquip[];
    guildsiege_defense_deck_equip_list?: Record<
        string,
        SiegeDefenseDeck
    >;
}

function isSwexData(value: unknown): value is SwexData {
    return typeof value === "object" && value !== null;
}

function collectUniqueRunes(data: SwexData): SwexRune[] {
    const inventoryRunes = Array.isArray(data.runes)
        ? data.runes
        : [];

    const equippedRunes = Array.isArray(data.unit_list)
        ? data.unit_list.flatMap((unit) =>
            Array.isArray(unit.runes) ? unit.runes : []
        )
        : [];

    const uniqueRunes: SwexRune[] = [];
    const knownRuneIds = new Set<number>();

    for (const rune of [...inventoryRunes, ...equippedRunes]) {
        if (
            !rune ||
            typeof rune.rune_id !== "number" ||
            knownRuneIds.has(rune.rune_id)
        ) {
            continue;
        }

        knownRuneIds.add(rune.rune_id);
        uniqueRunes.push(rune);
    }

    return uniqueRunes;
}

function createRuneMap(
    runes: readonly SwexRune[]
): Map<number, SwexRune> {
    const runeMap = new Map<number, SwexRune>();

    for (const rune of runes) {
        if (typeof rune.rune_id === "number") {
            runeMap.set(rune.rune_id, rune);
        }
    }

    return runeMap;
}

function sortRunesBySlot(runes: SwexRune[]): SwexRune[] {
    return [...runes].sort((firstRune, secondRune) => {
        if (firstRune.slot_no !== secondRune.slot_no) {
            return firstRune.slot_no - secondRune.slot_no;
        }

        return firstRune.rune_id - secondRune.rune_id;
    });
}

function getNormalRunes(
    monster: Monster,
    data: SwexData
): SwexRune[] {
    const unit = data.unit_list?.find(
        (candidate) => candidate.unit_id === monster.unitId
    );

    if (Array.isArray(unit?.runes)) {
        return sortRunesBySlot(unit.runes);
    }

    return sortRunesBySlot(
        Array.isArray(monster.runes)
            ? (monster.runes as SwexRune[])
            : []
    );
}

function getRtaRunes(
    monster: Monster,
    data: SwexData,
    runeMap: ReadonlyMap<number, SwexRune>
): SwexRune[] {
    const equippedRunes = Array.isArray(
        data.world_arena_rune_equip_list
    )
        ? data.world_arena_rune_equip_list
        : [];

    const runes = equippedRunes
        .filter(
            (equipment) =>
                equipment.occupied_id === monster.unitId &&
                typeof equipment.rune_id === "number"
        )
        .map((equipment) => runeMap.get(equipment.rune_id as number))
        .filter((rune): rune is SwexRune => rune !== undefined);

    return sortRunesBySlot(runes);
}

function getSiegeRunes(
    monster: Monster,
    data: SwexData,
    runeMap: ReadonlyMap<number, SwexRune>
): SwexRune[] {
    const deckValues = Object.values(
        data.guildsiege_defense_deck_equip_list ?? {}
    );

    for (const deck of deckValues) {
        const equippedUnits = Array.isArray(deck.equip)
            ? deck.equip
            : [];

        const equippedUnit = equippedUnits.find(
            (unit) => unit.unit_id === monster.unitId
        );

        if (!equippedUnit) {
            continue;
        }

        const runeIds = Array.isArray(equippedUnit.rune_id_list)
            ? equippedUnit.rune_id_list
            : [];

        const runes = runeIds
            .map((runeId) => runeMap.get(runeId))
            .filter((rune): rune is SwexRune => rune !== undefined);

        return sortRunesBySlot(runes);
    }

    return [];
}

export function getRunesForMode(
    monster: Monster,
    importMode: ImportMode,
    swexData: unknown
): SwexRune[] {
    if (!isSwexData(swexData)) {
        return sortRunesBySlot(
            Array.isArray(monster.runes)
                ? (monster.runes as SwexRune[])
                : []
        );
    }

    if (importMode === "NORMAL") {
        return getNormalRunes(monster, swexData);
    }

    const allRunes = collectUniqueRunes(swexData);
    const runeMap = createRuneMap(allRunes);

    if (importMode === "RTA") {
        return getRtaRunes(monster, swexData, runeMap);
    }

    if (importMode === "SIEGE") {
        return getSiegeRunes(monster, swexData, runeMap);
    }

    return [];
}
