import type {MainStatName, RuneSetName,} from "../data/runeData";

export type RuneSlot = 1 | 2 | 3 | 4 | 5 | 6;

export interface SwexRuneEffect {
    0: number;
    1: number;
    2?: number;
    3?: number;
}

export interface SwexRune {
    rune_id: number;
    set_id: number;
    slot_no: RuneSlot;

    pri_eff?: SwexRuneEffect;
    prefix_eff?: SwexRuneEffect;
    sec_eff?: SwexRuneEffect[];

    occupied_id?: number;

    upgrade_curr?: number;
    class?: number;
    quality?: number;

    [key: string]: unknown;
}

export interface RuneStats {
    hpFlat: number;
    hpPercent: number;

    atkFlat: number;
    atkPercent: number;

    defFlat: number;
    defPercent: number;

    spd: number;
    cr: number;
    cd: number;
    acc: number;
    res: number;
}

export interface PreparedRune {
    id: number;
    swopId: number;

    slot: RuneSlot;

    setId: number;
    setName: RuneSetName;

    mainStatId: number;
    mainStatName: MainStatName;

    equippedMonsterId?: number;

    stats: RuneStats;

    source: SwexRune;
}

export const EMPTY_RUNE_STATS: Readonly<RuneStats> = Object.freeze({
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
});