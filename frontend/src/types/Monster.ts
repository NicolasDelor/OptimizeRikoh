export interface Monster {
  id: number;

  unitId: number;

  swexIndex: number;

  duplicateNumber: number;

  name: string;

  imageUrl?: string;

  hp: number;
  atk: number;
  def: number;
  spd: number;

  cr: number;
  cd: number;
  acc: number;
  res: number;
}