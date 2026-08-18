export interface Monster {
  id: number;

  unitId: number;

  swexIndex: number;

  duplicateNumber: number;

  name: string;

  imageUrl?: string;

  runes?: any[];

  baseHp?: number;
  baseAtk?: number;
  baseDef?: number;
  baseSpd?: number;

  hp: number;
  atk: number;
  def: number;
  spd: number;

  cr: number;
  cd: number;
  acc: number;
  res: number;
}