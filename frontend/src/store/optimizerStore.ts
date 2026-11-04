import { useState } from "react";
import type { Monster } from "../types/Monster";
import type { MonsterConfig, OptimizableStat } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import type { SwexRune } from "../types/Rune";
import type { TeamOptimizationResult } from "../services/teamBuildOptimizer";
import { getActiveSets } from "../services/statCalculator";
import { mainStatNames } from "../data/runeData";

interface OptimizerMonsterResult {
  monsterId: number;
  monsterName: string;
  results: OptimizationResult[];
  totalBuilds?: number;
  statistics?: {
    branches: number;
    terminalBuilds: number;
    validBuilds: number;
    pruned: number;
    prunedSets: number;
    prunedMinimums: number;
    prunedMaximums: number;
    prunedLimits: number;
    elapsedMs: number;
    stoppedByResultLimit: boolean;
    stoppedByBranchLimit: boolean;
    stoppedByDurationLimit: boolean;
    stoppedByRequest: boolean;
    approximate: boolean;
  };
}

interface OptimizationProgressState {
  running: boolean;
  progress: number;
  explored: number;
  pruned: number;
  branches: number;
  total: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  currentMonsterId?: number;
  currentMonsterName?: string;
  monsterIndex: number;
  monsterCount: number;
}

interface ImportedMonsterData {
  unitId: number;
  swexIndex?: number;
  duplicateNumber?: number;
  name: string;
  imageUrl?: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  cr: number;
  cd: number;
  acc: number;
  res: number;
  runes?: SwexRune[];
}

const DEFAULT_FOCUS: OptimizableStat[] = ["spd"];
const DEFAULT_SEARCH_DEPTH = 5000;
const DEFAULT_RESULT_LIMIT = 1000;
const DEFAULT_MAX_BRANCHES = 5_000_000;
const DEFAULT_MAX_DURATION_MS = 30_000;

function createMonsterId(): number {
  return Date.now() * 1_000_000 + Math.floor(Math.random() * 1_000_000);
}

function getRuneMainStat(runes: readonly SwexRune[], slot: number): string {
  const rune = runes.find((candidate) => candidate.slot_no === slot);
  return mainStatNames[Number(rune?.pri_eff?.[0] ?? 0)] ?? "";
}

function createMonsterConfig(
  monsterId: number,
  runes: SwexRune[]
): MonsterConfig {
  const activeSets = getActiveSets(runes);
  const slot2MainStat = getRuneMainStat(runes, 2);
  const slot4MainStat = getRuneMainStat(runes, 4);
  const slot6MainStat = getRuneMainStat(runes, 6);

  return {
    monsterId,
    stats: {},
    requiredSet1: activeSets[0] ? [activeSets[0]] : [],
    requiredSet2: activeSets[1] ? [activeSets[1]] : [],
    requiredSet3: activeSets[2] ? [activeSets[2]] : [],
    forbiddenSets: [],
    slot2MainStats: slot2MainStat ? [slot2MainStat] : [],
    slot4MainStats: slot4MainStat ? [slot4MainStat] : [],
    slot6MainStats: slot6MainStat ? [slot6MainStat] : [],
    focus: [...DEFAULT_FOCUS],
    searchDepth: DEFAULT_SEARCH_DEPTH,
    resultLimit: DEFAULT_RESULT_LIMIT,
    maxBranches: DEFAULT_MAX_BRANCHES,
    maxDurationMs: DEFAULT_MAX_DURATION_MS,
  };
}

function normalizeMonsterConfig(
  existingConfig: MonsterConfig,
  configUpdate: Partial<MonsterConfig>
): MonsterConfig {
  return {
    ...existingConfig,
    ...configUpdate,
    stats: configUpdate.stats
      ? { ...existingConfig.stats, ...configUpdate.stats }
      : existingConfig.stats,
    requiredSet1: configUpdate.requiredSet1 ?? existingConfig.requiredSet1,
    requiredSet2: configUpdate.requiredSet2 ?? existingConfig.requiredSet2,
    requiredSet3: configUpdate.requiredSet3 ?? existingConfig.requiredSet3,
    forbiddenSets: configUpdate.forbiddenSets ?? existingConfig.forbiddenSets,
    slot2MainStats:
      configUpdate.slot2MainStats ?? existingConfig.slot2MainStats,
    slot4MainStats:
      configUpdate.slot4MainStats ?? existingConfig.slot4MainStats,
    slot6MainStats:
      configUpdate.slot6MainStats ?? existingConfig.slot6MainStats,
    focus: configUpdate.focus ?? existingConfig.focus,
    searchDepth: configUpdate.searchDepth ?? existingConfig.searchDepth,
    resultLimit: configUpdate.resultLimit ?? existingConfig.resultLimit,
    maxBranches: configUpdate.maxBranches ?? existingConfig.maxBranches,
    maxDurationMs: configUpdate.maxDurationMs ?? existingConfig.maxDurationMs,
  };
}

export function useOptimizerStore() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(
    null
  );
  const [configs, setConfigs] = useState<Record<number, MonsterConfig>>({});
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [runePriorityOrder, setRunePriorityOrder] = useState<number[]>([]);
  const [swexData, setSwexData] = useState<unknown>(null);
  const [results, setResults] = useState<OptimizerMonsterResult[]>([]);
  const [teamResults, setTeamResults] = useState<TeamOptimizationResult[]>([]);
  const [optimizationProgress, setOptimizationProgress] =
    useState<OptimizationProgressState>({
      running: false,
      progress: 0,
      explored: 0,
      pruned: 0,
      branches: 0,
      total: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
      monsterIndex: 0,
      monsterCount: 0,
    });
  const [importMode, setImportMode] = useState<"NORMAL" | "RTA" | "SIEGE">(
    "NORMAL"
  );

  const addMonster = (serializedMonster: string): void => {
    let importedMonster: ImportedMonsterData;

    try {
      importedMonster = JSON.parse(serializedMonster) as ImportedMonsterData;
    } catch {
      return;
    }

    if (
      typeof importedMonster.unitId !== "number" ||
      typeof importedMonster.name !== "string" ||
      monsters.some((monster) => monster.unitId === importedMonster.unitId)
    ) {
      return;
    }

    const id = createMonsterId();
    const runes = Array.isArray(importedMonster.runes)
      ? importedMonster.runes
      : [];

    const monster: Monster = {
      id,
      unitId: importedMonster.unitId,
      swexIndex: importedMonster.swexIndex,
      duplicateNumber: importedMonster.duplicateNumber,
      name: importedMonster.name,
      imageUrl: importedMonster.imageUrl,
      runes,
      baseHp: Number(importedMonster.baseHp ?? importedMonster.hp ?? 0),
      baseAtk: Number(importedMonster.baseAtk ?? importedMonster.atk ?? 0),
      baseDef: Number(importedMonster.baseDef ?? importedMonster.def ?? 0),
      baseSpd: Number(importedMonster.baseSpd ?? importedMonster.spd ?? 0),
      hp: Number(importedMonster.hp ?? 0),
      atk: Number(importedMonster.atk ?? 0),
      def: Number(importedMonster.def ?? 0),
      spd: Number(importedMonster.spd ?? 0),
      cr: Number(importedMonster.cr ?? 0),
      cd: Number(importedMonster.cd ?? 0),
      acc: Number(importedMonster.acc ?? 0),
      res: Number(importedMonster.res ?? 0),
    };

    const config = createMonsterConfig(id, runes);

    setMonsters((previousMonsters) => [...previousMonsters, monster]);
    setConfigs((previousConfigs) => ({
      ...previousConfigs,
      [id]: config,
    }));
    setPlayOrder((previousOrder) => [...previousOrder, id]);
    setRunePriorityOrder((previousOrder) => [...previousOrder, id]);
    setResults([]);
    setTeamResults([]);
    setSelectedMonsterId(id);
  };

  const removeMonster = (id: number): void => {
    setMonsters((previousMonsters) =>
      previousMonsters.filter((monster) => monster.id !== id)
    );
    setConfigs((previousConfigs) => {
      const nextConfigs = { ...previousConfigs };
      delete nextConfigs[id];
      return nextConfigs;
    });
    setResults((previousResults) =>
      previousResults.filter((result) => result.monsterId !== id)
    );
    setPlayOrder((previousOrder) =>
      previousOrder.filter((monsterId) => monsterId !== id)
    );
    setRunePriorityOrder((previousOrder) =>
      previousOrder.filter((monsterId) => monsterId !== id)
    );
    setTeamResults([]);
    setSelectedMonsterId((currentId) => (currentId === id ? null : currentId));
  };

  const updateConfig = (
    monsterId: number,
    configUpdate: Partial<MonsterConfig>
  ): void => {
    setConfigs((previousConfigs) => {
      const existingConfig = previousConfigs[monsterId];

      if (!existingConfig) {
        return previousConfigs;
      }

      return {
        ...previousConfigs,
        [monsterId]: normalizeMonsterConfig(existingConfig, configUpdate),
      };
    });
    setResults([]);
    setTeamResults([]);
  };

  const reorderMonsterIds = (
    order: readonly number[],
    sourceIndex: number,
    destinationIndex: number
  ): number[] => {
    if (
      sourceIndex < 0 ||
      destinationIndex < 0 ||
      sourceIndex >= order.length ||
      destinationIndex >= order.length ||
      sourceIndex === destinationIndex
    ) {
      return [...order];
    }

    const nextOrder = [...order];
    const [movedMonsterId] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(destinationIndex, 0, movedMonsterId);

    return nextOrder;
  };

  const movePlayOrderMonster = (
    sourceIndex: number,
    destinationIndex: number
  ): void => {
    setPlayOrder((previousOrder) =>
      reorderMonsterIds(previousOrder, sourceIndex, destinationIndex)
    );
    setResults([]);
    setTeamResults([]);
  };

  const moveRunePriorityMonster = (
    sourceIndex: number,
    destinationIndex: number
  ): void => {
    setRunePriorityOrder((previousOrder) =>
      reorderMonsterIds(previousOrder, sourceIndex, destinationIndex)
    );
    setResults([]);
    setTeamResults([]);
  };

  const clearTeam = (): void => {
    setMonsters([]);
    setConfigs({});
    setPlayOrder([]);
    setRunePriorityOrder([]);
    setResults([]);
    setTeamResults([]);
    setSelectedMonsterId(null);
    setOptimizationProgress({
      running: false,
      progress: 0,
      explored: 0,
      pruned: 0,
      branches: 0,
      total: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
      monsterIndex: 0,
      monsterCount: 0,
    });
  };

  return {
    optimizationProgress,
    setOptimizationProgress,
    monsters,
    configs,
    playOrder,
    runePriorityOrder,
    movePlayOrderMonster,
    moveRunePriorityMonster,
    selectedMonsterId,
    setSelectedMonsterId,
    results,
    setResults,
    teamResults,
    setTeamResults,
    swexData,
    setSwexData,
    addMonster,
    removeMonster,
    updateConfig,
    clearTeam,
    importMode,
    setImportMode,
  };
}
