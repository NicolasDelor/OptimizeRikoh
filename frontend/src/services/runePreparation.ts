import {getMainStatName, getRuneSetName,} from "../data/runeData";
import type {PreparedRune, RuneStats, SwexRune, SwexRuneEffect,} from "../types/Rune";

function addEffect(stats: RuneStats, effect?: SwexRuneEffect): void {
    if (!effect) {
        return;
    }

    const statId = Number(effect[0]);
    const baseValue = Number(effect[1] ?? 0);
    const grindValue = Number(effect[3] ?? 0);
    const totalValue = baseValue + grindValue;

    switch (statId) {
        case 1:
            stats.hpFlat += totalValue;
            break;

        case 2:
            stats.hpPercent += totalValue;
            break;

        case 3:
            stats.atkFlat += totalValue;
            break;

        case 4:
            stats.atkPercent += totalValue;
            break;

        case 5:
            stats.defFlat += totalValue;
            break;

        case 6:
            stats.defPercent += totalValue;
            break;

        case 8:
            stats.spd += totalValue;
            break;

        case 9:
            stats.cr += totalValue;
            break;

        case 10:
            stats.cd += totalValue;
            break;

        case 11:
            stats.res += totalValue;
            break;

        case 12:
            stats.acc += totalValue;
            break;
    }
}

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

export function prepareRune(
    rune: SwexRune,
    swopId: number
): PreparedRune | null {
    const setName = getRuneSetName(rune.set_id);
    const mainStatId = Number(rune.pri_eff?.[0] ?? 0);
    const mainStatName = getMainStatName(mainStatId);

    if (!setName || !mainStatName) {
        return null;
    }

    if (
        rune.slot_no !== 1 &&
        rune.slot_no !== 2 &&
        rune.slot_no !== 3 &&
        rune.slot_no !== 4 &&
        rune.slot_no !== 5 &&
        rune.slot_no !== 6
    ) {
        return null;
    }

    const stats = createEmptyRuneStats();

    addEffect(stats, rune.pri_eff);
    addEffect(stats, rune.prefix_eff);

    for (const secondaryEffect of rune.sec_eff ?? []) {
        addEffect(stats, secondaryEffect);
    }

    return {
        id: rune.rune_id,
        swopId,

        slot: rune.slot_no,

        setId: rune.set_id,
        setName,

        mainStatId,
        mainStatName,

        equippedMonsterId:
            typeof rune.occupied_id === "number"
                ? rune.occupied_id
                : undefined,

        stats,

        source: rune,
    };
}

export function prepareRunes(runes: SwexRune[]): PreparedRune[] {
    const preparedRunes: PreparedRune[] = [];
    const knownRuneIds = new Set<number>();

    for (let index = 0; index < runes.length; index++) {
        const rune = runes[index];

        if (!rune || knownRuneIds.has(rune.rune_id)) {
            continue;
        }

        const preparedRune = prepareRune(rune, index + 1);

        if (!preparedRune) {
            continue;
        }

        knownRuneIds.add(preparedRune.id);
        preparedRunes.push(preparedRune);
    }

    return preparedRunes;
}

export function collectSwexRunes(swexData: unknown): SwexRune[] {
    if (!swexData || typeof swexData !== "object") {
        return [];
    }

    const data = swexData as {
        runes?: SwexRune[];
        unit_list?: Array<{
            runes?: SwexRune[];
        }>;
    };

    const inventoryRunes = Array.isArray(data.runes)
        ? data.runes
        : [];

    const equippedRunes = Array.isArray(data.unit_list)
        ? data.unit_list.flatMap((unit) =>
            Array.isArray(unit.runes) ? unit.runes : []
        )
        : [];

    const allRunes = [...inventoryRunes, ...equippedRunes];
    const uniqueRunes: SwexRune[] = [];
    const knownRuneIds = new Set<number>();

    for (const rune of allRunes) {
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