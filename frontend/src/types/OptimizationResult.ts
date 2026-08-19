export interface OptimizationResult {
  monsterId: number;

  hp: number;
  atk: number;
  def: number;
  spd: number;

  cr: number;
  cd: number;
  acc: number;
  res: number;

  ehp: number;

  sets: string[];

  slot2: string;
  slot4: string;
  slot6: string;

  runeIds: number[];

  score: number;
}