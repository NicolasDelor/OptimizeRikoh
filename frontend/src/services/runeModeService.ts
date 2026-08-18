import type { Monster } from "../types/Monster";

export function getRunesForMode(
  monster: Monster,
  importMode: "NORMAL" | "RTA" | "SIEGE",
  swexData: any
) {
  if (!swexData) {
    return monster.runes ?? [];
  }

  if (importMode === "NORMAL") {
    return monster.runes ?? [];
  }

  const allRunes = swexData.runes ?? [];

  const runeMap = new Map(allRunes.map((rune: any) => [rune.rune_id, rune]));

  if (importMode === "RTA") {
    return (
      swexData.world_arena_rune_equip_list
        ?.filter((r: any) => r.occupied_id === monster.unitId)
        .map((r: any) => runeMap.get(r.rune_id))
        .filter(Boolean) ?? []
    );
  }

  if (importMode === "SIEGE") {
    const decks = Object.values(
      swexData.guildsiege_defense_deck_equip_list ?? {}
    ) as any[];

    const unit = decks
      .flatMap((deck) => deck.equip)
      .find((u: any) => u.unit_id === monster.unitId);

    if (!unit) {
      return [];
    }

    return (
      unit.rune_id_list?.map((id: number) => runeMap.get(id)).filter(Boolean) ??
      []
    );
  }

  return monster.runes ?? [];
}
