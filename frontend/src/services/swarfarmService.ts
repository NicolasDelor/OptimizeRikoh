import monstersData from "../data/swarfarm-monsters.json";

export interface SwarfarmMonster {
  com2us_id: number;
  name: string;
  image_filename: string;
}

const map: Record<number, SwarfarmMonster> = {};

(monstersData as SwarfarmMonster[]).forEach((monster) => {
  map[monster.com2us_id] = monster;
});

export function loadSwarfarmMonsters() {
  return Promise.resolve(map);
}
