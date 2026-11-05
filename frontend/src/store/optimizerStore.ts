import { useState } from "react";
import { mainStatNames } from "../data/runeData";
import {
  getSavedMode,
  loadMonsterConfig,
  saveMode,
  saveMonsterConfig,
  type OptimizationMode,
} from "../services/optimizerPreferencesStorage";
import { getActiveSets } from "../services/statCalculator";
import type { TeamOptimizationResult } from "../services/teamBuildOptimizer";
import type { Monster } from "../types/Monster";
import type { MonsterConfig, OptimizableStat } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";
import type { SwexRune } from "../types/Rune";

export interface OptimizerMonsterResult {
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

interface ImportedMonsterData extends Omit<Monster, "id" | "runes"> {
  runes?: SwexRune[];
}

const DEFAULT_FOCUS: OptimizableStat[] = ["spd"];
const DEFAULT_SEARCH_DEPTH = 5000;
const DEFAULT_RESULT_LIMIT = 1000;
const DEFAULT_MAX_BRANCHES = 5_000_000;
const DEFAULT_MAX_DURATION_MS = 30_000;

function emptyProgress(): OptimizationProgressState {
  return {
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
  };
}

function createMonsterId(): number {
  return Date.now() * 1_000_000 + Math.floor(Math.random() * 1_000_000);
}

function getRuneMainStat(runes: readonly SwexRune[], slot: number): string {
  const rune = runes.find((candidate) => candidate.slot_no === slot);
  return mainStatNames[Number(rune?.pri_eff?.[0] ?? 0)] ?? "";
}

function asSwexRunes(runes: readonly unknown[]): SwexRune[] {
  return runes.filter(
    (rune): rune is SwexRune =>
      typeof rune === "object" &&
      rune !== null &&
      "rune_id" in rune &&
      "slot_no" in rune
  );
}

function createDefaultConfig(
  monsterId: number,
  runes: SwexRune[]
): MonsterConfig {
  const activeSets = getActiveSets(runes);
  const slot2 = getRuneMainStat(runes, 2);
  const slot4 = getRuneMainStat(runes, 4);
  const slot6 = getRuneMainStat(runes, 6);

  return {
    monsterId,
    stats: {},
    requiredSet1: activeSets[0] ? [activeSets[0]] : [],
    requiredSet2: activeSets[1] ? [activeSets[1]] : [],
    requiredSet3: activeSets[2] ? [activeSets[2]] : [],
    forbiddenSets: [],
    slot2MainStats: slot2 ? [slot2] : [],
    slot4MainStats: slot4 ? [slot4] : [],
    slot6MainStats: slot6 ? [slot6] : [],
    focus: [...DEFAULT_FOCUS],
    searchDepth: DEFAULT_SEARCH_DEPTH,
    resultLimit: DEFAULT_RESULT_LIMIT,
    maxBranches: DEFAULT_MAX_BRANCHES,
    maxDurationMs: DEFAULT_MAX_DURATION_MS,
  };
}

function normalizeConfig(
  existing: MonsterConfig,
  update: Partial<MonsterConfig>
): MonsterConfig {
  return {
    ...existing,
    ...update,
    stats: update.stats
      ? { ...existing.stats, ...update.stats }
      : existing.stats,
    requiredSet1: update.requiredSet1 ?? existing.requiredSet1,
    requiredSet2: update.requiredSet2 ?? existing.requiredSet2,
    requiredSet3: update.requiredSet3 ?? existing.requiredSet3,
    forbiddenSets: update.forbiddenSets ?? existing.forbiddenSets,
    slot2MainStats: update.slot2MainStats ?? existing.slot2MainStats,
    slot4MainStats: update.slot4MainStats ?? existing.slot4MainStats,
    slot6MainStats: update.slot6MainStats ?? existing.slot6MainStats,
    focus: update.focus ?? existing.focus,
    searchDepth: update.searchDepth ?? existing.searchDepth,
    resultLimit: update.resultLimit ?? existing.resultLimit,
    maxBranches: update.maxBranches ?? existing.maxBranches,
    maxDurationMs: update.maxDurationMs ?? existing.maxDurationMs,
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
    useState(emptyProgress());
  const [importMode, setImportModeState] = useState<OptimizationMode>(() =>
    getSavedMode()
  );

  const setImportMode = (mode: OptimizationMode): void => {
    saveMode(mode);
    setImportModeState(mode);
    setConfigs((previous) => {
      const next = { ...previous };

      for (const monster of monsters) {
        const monsterRunes = asSwexRunes(monster.runes);
        next[monster.id] =
          loadMonsterConfig(monster.unitId, monster.id, mode) ??
          createDefaultConfig(monster.id, monsterRunes);
      }

      return next;
    });
    setResults([]);
    setTeamResults([]);
  };

  const addMonster = (serializedMonster: string): void => {
    let imported: ImportedMonsterData;
    try {
      imported = JSON.parse(serializedMonster) as ImportedMonsterData;
    } catch {
      return;
    }

    if (
      typeof imported.unitId !== "number" ||
      typeof imported.name !== "string" ||
      monsters.some((monster) => monster.unitId === imported.unitId)
    ) {
      return;
    }

    const id = createMonsterId();
    const runes = Array.isArray(imported.runes)
      ? asSwexRunes(imported.runes)
      : [];
    const monster: Monster = { ...imported, id, runes };
    const config =
      loadMonsterConfig(imported.unitId, id, importMode) ??
      createDefaultConfig(id, runes);

    setMonsters((previous) => [...previous, monster]);
    setConfigs((previous) => ({ ...previous, [id]: config }));
    setPlayOrder((previous) => [...previous, id]);
    setRunePriorityOrder((previous) => [...previous, id]);
    setResults([]);
    setTeamResults([]);
    setSelectedMonsterId(id);
  };

  const removeMonster = (id: number): void => {
    setMonsters((previous) => previous.filter((monster) => monster.id !== id));
    setConfigs((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setResults((previous) =>
      previous.filter((result) => result.monsterId !== id)
    );
    setPlayOrder((previous) =>
      previous.filter((monsterId) => monsterId !== id)
    );
    setRunePriorityOrder((previous) =>
      previous.filter((monsterId) => monsterId !== id)
    );
    setTeamResults([]);
    setSelectedMonsterId((current) => (current === id ? null : current));
  };

  const updateConfig = (
    monsterId: number,
    update: Partial<MonsterConfig>
  ): void => {
    setConfigs((previous) => {
      const existing = previous[monsterId];
      const monster = monsters.find((item) => item.id === monsterId);
      if (!existing || !monster) return previous;

      const nextConfig = normalizeConfig(existing, update);
      saveMonsterConfig(monster.unitId, importMode, nextConfig);
      return { ...previous, [monsterId]: nextConfig };
    });
    setResults([]);
    setTeamResults([]);
  };

  const reorder = (
    order: readonly number[],
    source: number,
    destination: number
  ) => {
    if (
      source < 0 ||
      destination < 0 ||
      source >= order.length ||
      destination >= order.length ||
      source === destination
    )
      return [...order];
    const next = [...order];
    const [moved] = next.splice(source, 1);
    next.splice(destination, 0, moved);
    return next;
  };

  const movePlayOrderMonster = (source: number, destination: number): void => {
    setPlayOrder((previous) => reorder(previous, source, destination));
    setResults([]);
    setTeamResults([]);
  };

  const moveRunePriorityMonster = (
    source: number,
    destination: number
  ): void => {
    setRunePriorityOrder((previous) => reorder(previous, source, destination));
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
    setOptimizationProgress(emptyProgress());
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
