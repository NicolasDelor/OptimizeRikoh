import type { MainStatName, RuneSetName } from "../data/runeData";
import type { RuneSlot } from "./Rune";

export interface OptimizationResultRune {
  id: number;
  slot: RuneSlot;
  setName: RuneSetName;
  level: number;
  stars: number;
}

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
  efficiency: number;
  damage: number;

  sets: RuneSetName[];

  slot2: MainStatName | "";
  slot4: MainStatName | "";
  slot6: MainStatName | "";

  runeIds: number[];
  runes: OptimizationResultRune[];

  score: number;
}
