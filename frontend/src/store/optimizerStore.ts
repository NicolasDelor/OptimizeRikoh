import { useState } from "react";
import type { Monster } from "../../types/Monster";
import type { MonsterConfig } from "../../types/MonsterConfig";

export function useOptimizerStore() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(
    null
  );

  const [configs, setConfigs] = useState<Record<number, MonsterConfig>>({});

  const addMonster = (monsterData: string) => {
    const swexMonster = JSON.parse(monsterData);

    const id = Date.now();

    const monster: Monster = {
      id,

      name: String(swexMonster.id),

      hp: swexMonster.hp,
      atk: swexMonster.atk,
      def: swexMonster.def,
      spd: swexMonster.spd,

      cr: swexMonster.cr,
      cd: swexMonster.cd,
      acc: swexMonster.acc,
      res: swexMonster.res,
    };

    const config: MonsterConfig = {
      monsterId: id,
      stats: {},
      requiredSets: [],
      forbiddenSets: [],

      speedOrder: 1,
    };

    setMonsters((prev) => [...prev, monster]);

    setConfigs((prev) => ({
      ...prev,
      [id]: config,
    }));

    setSelectedMonsterId(id);
  };

  const [importMode, setImportMode] = useState<
    "NORMAL" | "RTA" | "SIEGE"
  >("NORMAL");

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
    setConfigs((prev) => ({
      ...prev,
      [monsterId]: {
        ...prev[monsterId],
        ...configUpdate,
      },
    }));
  };

  return {
    monsters,
    configs,
    selectedMonsterId,
    addMonster,
    removeMonster,
    updateConfig,
    setSelectedMonsterId,
    importMode,
    setImportMode,
  };
}
