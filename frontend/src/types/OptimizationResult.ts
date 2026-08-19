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

  runeIds: number[];

  score: number;
}