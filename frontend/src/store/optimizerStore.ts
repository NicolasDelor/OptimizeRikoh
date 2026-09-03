import { useState } from "react";
import type { Monster } from "../../types/Monster";
import type { MonsterConfig } from "../../types/MonsterConfig";
import { runeSetNames, mainStatNames } from "../data/runeData";
import type { OptimizationResult } from "../types/OptimizationResult";
import { getActiveSets } from "../services/statCalculator";

export function useOptimizerStore() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(
    null
  );

  const [configs, setConfigs] = useState<Record<number, MonsterConfig>>({});

  const [swexData, setSwexData] = useState<any>(null);

  const [results, setResults] = useState<
    {
      monsterId: number;
      monsterName: string;
      results: OptimizationResult[];
    }[]
  >([]);

  const [optimizationProgress, setOptimizationProgress] = useState({
    running: false,
    progress: 0,
    explored: 0,
    pruned: 0,
    elapsedMs: 0,
    estimatedRemainingMs: 0,
  });

  const runeSetNames: Record<number, string> = {
    1: "Fatal",
    2: "Energy",
    3: "Swift",
    4: "Blade",
    5: "Rage",
    6: "Focus",
    7: "Endure",
    8: "Guard",
    10: "Despair",
    11: "Vampire",
    13: "Violent",
    14: "Nemesis",
    15: "Will",
    16: "Shield",
    17: "Revenge",
    18: "Destroy",
    19: "Fight",
    20: "Determination",
    21: "Enhance",
    22: "Accuracy",
    23: "Tolerance",
  };

  const mainStatNames: Record<number, string> = {
    1: "HP Flat",
    2: "HP%",
    3: "ATK Flat",
    4: "ATK%",
    5: "DEF Flat",
    6: "DEF%",
    8: "SPD",
    9: "CR",
    10: "CD",
    11: "RES",
    12: "ACC",
  };

  const addMonster = (monsterData: string) => {
    const swexMonster = JSON.parse(monsterData);

    console.log("ADD MONSTER", swexMonster.name, swexMonster.unitId);

    const id = Date.now();
    console.log("MONSTER ID", swexMonster.name, id);
    const monster: Monster = {
      id,

      unitId: swexMonster.unitId,

      name: swexMonster.name,

      imageUrl: swexMonster.imageUrl,

      baseHp: swexMonster.baseHp,
      baseAtk: swexMonster.baseAtk,
      baseDef: swexMonster.baseDef,
      baseSpd: swexMonster.baseSpd,

      runes: swexMonster.runes ?? [],

      hp: swexMonster.hp,
      atk: swexMonster.atk,
      def: swexMonster.def,
      spd: swexMonster.spd,

      cr: swexMonster.cr,
      cd: swexMonster.cd,
      acc: swexMonster.acc,
      res: swexMonster.res,
    };

    const activeSets = getActiveSets(swexMonster.runes ?? []);

    const slot2Rune = swexMonster.runes?.find((r: any) => r.slot_no === 2);
    const slot4Rune = swexMonster.runes?.find((r: any) => r.slot_no === 4);
    const slot6Rune = swexMonster.runes?.find((r: any) => r.slot_no === 6);

    const slot2Main = mainStatNames[slot2Rune?.pri_eff?.[0]] ?? "";

    const slot4Main = mainStatNames[slot4Rune?.pri_eff?.[0]] ?? "";

    const slot6Main = mainStatNames[slot6Rune?.pri_eff?.[0]] ?? "";

    console.log("MONSTER IMPORT", {
      name: swexMonster.name,
      unitId: swexMonster.unitId,
      activeSets,
      requiredSet1: activeSets[0] ? [activeSets[0]] : [],
      requiredSet2: activeSets[1] ? [activeSets[1]] : [],
      requiredSet3: activeSets[2] ? [activeSets[2]] : [],
    });

    const config: MonsterConfig = {
      monsterId: id,
      stats: {},

      requiredSet1: activeSets[0] ? [activeSets[0]] : [],
      requiredSet2: activeSets[1] ? [activeSets[1]] : [],
      requiredSet3: activeSets[2] ? [activeSets[2]] : [],

      forbiddenSets: [],

      slot2MainStats: slot2Main ? [slot2Main] : [],
      slot4MainStats: slot4Main ? [slot4Main] : [],
      slot6MainStats: slot6Main ? [slot6Main] : [],

      speedOrder: 1,

      focus: ["spd"],

      searchDepth: 10,
    };

    setMonsters((prev) => {
      const next = [...prev, monster];

      console.log("MONSTERS COUNT", next.length);

      return next;
    });
    setConfigs((prev) => ({
      ...prev,
      [id]: config,
    }));

    setSelectedMonsterId(id);
  };

  const [importMode, setImportMode] = useState<"NORMAL" | "RTA" | "SIEGE">(
    "NORMAL"
  );

  const removeMonster = (id: number) => {
    setMonsters((prev) => prev.filter((monster) => monster.id !== id));

    setConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (selectedMonsterId === id) {
      setSelectedMonsterId(null);
    }
  };

  const updateConfig = (
    monsterId: number,
    configUpdate: Partial<MonsterConfig>
  ) => {
    setConfigs((prev) => {
      const nextConfig = {
        ...prev[monsterId],
        ...configUpdate,
      };

      return {
        ...prev,
        [monsterId]: nextConfig,
      };
    });
  };

  return {
    optimizationProgress,
    setOptimizationProgress,
    monsters,
    configs,
    selectedMonsterId,
    results,
    setResults,
    swexData,
    addMonster,
    removeMonster,
    updateConfig,
    setSelectedMonsterId,
    importMode,
    setImportMode,
    setSwexData,
  };
}
