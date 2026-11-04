import { useEffect, useMemo, useRef, useState } from "react";
import TeamPanel from "../components/team/TeamPanel";
import TeamMonsterCard from "../components/team/TeamMonsterCard";
import TeamOrdersPanel from "../components/team/TeamOrdersPanel";
import ResultsPanel from "../components/results/ResultsPanel";
import TeamResultsPanel from "../components/results/TeamResultsPanel";
import { useOptimizerStore } from "../store/optimizerStore";
import { loadSwarfarmMonsters } from "../services/swarfarmService";
import { collectSwexRunes } from "../services/runePreparation";
import type { Monster } from "../types/Monster";
import type { OptimizationResult } from "../types/OptimizationResult";
import type {
  TeamOptimizationResult,
  TeamOptimizationStatistics,
} from "../services/teamBuildOptimizer";

interface SwarfarmMonsterData {
  name: string;
  image_filename: string;
  base_hp?: number;
  base_attack?: number;
  base_defense?: number;
  speed?: number;
}

interface SwexUnit {
  unit_id: number;
  unit_master_id: number;
  con?: number;
  atk?: number;
  def?: number;
  spd?: number;
  critical_rate?: number;
  critical_damage?: number;
  accuracy?: number;
  resist?: number;
  runes?: unknown[];
}

interface SwexData {
  unit_list?: SwexUnit[];
  runes?: unknown[];
  artifact_list?: unknown[];
  [key: string]: unknown;
}

interface ImportStatus {
  fileName: string;
  monsters: number;
  runes: number;
  artifacts: number;
}

interface MonsterStatistics {
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
}

interface MonsterWorkerResult {
  monsterId: number;
  monsterName: string;
  results: OptimizationResult[];
  totalBuilds: number;
  statistics: MonsterStatistics;
}

type WorkerMessage =
  | {
      type: "prepared";
      preparedRuneCount: number;
    }
  | {
      type: "progress";
      currentMonsterId: number;
      currentMonsterName: string;
      monsterIndex: number;
      monsterCount: number;
      explored: number;
      pruned: number;
      branches: number;
      total: number;
    }
  | {
      type: "monster-result";
      monsterName: string;
      resultCount: number;
    }
  | {
      type: "monster-error";
      monsterName: string;
      error: string;
    }
  | {
      type: "team-result";
      results: TeamOptimizationResult[];
      statistics: TeamOptimizationStatistics;
    }
  | {
      type: "result";
      results: MonsterWorkerResult[];
      teamResults: TeamOptimizationResult[];
      teamStatistics: TeamOptimizationStatistics;
      summary: {
        monsterCount: number;
        completedMonsterCount: number;
        explored: number;
        pruned: number;
        branches: number;
        totalElapsedMs: number;
        approximate: boolean;
      };
    };

const SWEX_CACHE_KEY = "swexData";

function createAvailableMonsters(
  data: SwexData,
  swarfarmMonsters: Record<number, SwarfarmMonsterData>
): Monster[] {
  const units = Array.isArray(data.unit_list) ? data.unit_list : [];
  const occurrences = new Map<number, number>();

  return units.map((unit, swexIndex) => {
    const reference = swarfarmMonsters[unit.unit_master_id];
    const duplicateNumber = (occurrences.get(unit.unit_master_id) ?? 0) + 1;

    occurrences.set(unit.unit_master_id, duplicateNumber);

    const baseName = reference?.name ?? String(unit.unit_master_id);
    const baseHp = Number(reference?.base_hp ?? unit.con ?? 0);
    const baseAtk = Number(reference?.base_attack ?? unit.atk ?? 0);
    const baseDef = Number(reference?.base_defense ?? unit.def ?? 0);
    const baseSpd = Number(reference?.speed ?? unit.spd ?? 0);

    return {
      id: unit.unit_id,
      unitId: unit.unit_id,
      swexIndex,
      duplicateNumber,
      name: duplicateNumber === 1 ? baseName : `${baseName} ${duplicateNumber}`,
      imageUrl: reference
        ? `https://swarfarm.com/static/herders/images/monsters/${reference.image_filename}`
        : undefined,
      runes: Array.isArray(unit.runes) ? unit.runes : [],
      baseHp,
      baseAtk,
      baseDef,
      baseSpd,
      hp: baseHp,
      atk: Number(unit.atk ?? baseAtk),
      def: Number(unit.def ?? baseDef),
      spd: baseSpd,
      cr: Number(unit.critical_rate ?? 15),
      cd: Number(unit.critical_damage ?? 50),
      acc: Number(unit.accuracy ?? 0),
      res: Number(unit.resist ?? 15),
    };
  });
}

function createImportStatus(data: SwexData, fileName: string): ImportStatus {
  return {
    fileName,
    monsters: data.unit_list?.length ?? 0,
    runes: collectSwexRunes(data).length,
    artifacts: data.artifact_list?.length ?? 0,
  };
}

function calculateProgress(
  explored: number,
  pruned: number,
  total: number
): number {
  if (total <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round(((explored + pruned) * 100) / total))
  );
}

export default function TeamOptimizerPage() {
  const store = useOptimizerStore();
  const workerRef = useRef<Worker | null>(null);
  const startedAtRef = useRef(0);

  const [swarfarmMonsters, setSwarfarmMonsters] = useState<
    Record<number, SwarfarmMonsterData>
  >({});
  const [availableMonsters, setAvailableMonsters] = useState<Monster[]>([]);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [workerStatus, setWorkerStatus] = useState("");
  const [optimizationError, setOptimizationError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let active = true;

    loadSwarfarmMonsters().then((monsters) => {
      if (active) {
        setSwarfarmMonsters(monsters as Record<number, SwarfarmMonsterData>);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Object.keys(swarfarmMonsters).length === 0) return;

    const cached = localStorage.getItem(SWEX_CACHE_KEY);
    if (!cached) return;

    try {
      const data = JSON.parse(cached) as SwexData;
      store.setSwexData(data);
      setAvailableMonsters(createAvailableMonsters(data, swarfarmMonsters));
      setImportStatus(createImportStatus(data, "Cache"));
    } catch {
      localStorage.removeItem(SWEX_CACHE_KEY);
    }
  }, [swarfarmMonsters]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const orderedMonsters = useMemo(() => {
    const monstersById = new Map(
      store.monsters.map((monster) => [monster.id, monster])
    );

    const ordered = store.playOrder
      .map((monsterId) => monstersById.get(monsterId))
      .filter((monster): monster is Monster => monster !== undefined);

    const orderedIds = new Set(ordered.map((monster) => monster.id));
    const missingMonsters = store.monsters.filter(
      (monster) => !orderedIds.has(monster.id)
    );

    return [...ordered, ...missingMonsters];
  }, [store.monsters, store.playOrder]);

  const importSwexData = (data: SwexData, fileName: string): void => {
    store.setSwexData(data);
    store.setResults([]);
    store.setTeamResults([]);
    setAvailableMonsters(createAvailableMonsters(data, swarfarmMonsters));
    setImportStatus(createImportStatus(data, fileName));
  };

  const handleImportSwex = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const data = JSON.parse(await file.text()) as SwexData;
      localStorage.setItem(SWEX_CACHE_KEY, JSON.stringify(data));
      importSwexData(data, file.name);
      setOptimizationError(null);
    } catch (error) {
      setOptimizationError(
        `Import SWEX impossible : ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const stopOptimization = (): void => {
    workerRef.current?.terminate();
    workerRef.current = null;
    store.setOptimizationProgress((previous) => ({
      ...previous,
      running: false,
    }));
    setWorkerStatus("Optimisation arrêtée.");
  };

  const startOptimization = (): void => {
    if (store.optimizationProgress.running) return;

    if (!store.swexData || orderedMonsters.length === 0) {
      setOptimizationError(
        "Importe un fichier SWEX et sélectionne au moins un monstre."
      );
      return;
    }

    const allRunes = collectSwexRunes(store.swexData);
    if (allRunes.length === 0) {
      setOptimizationError("Aucune rune exploitable trouvée.");
      return;
    }

    workerRef.current?.terminate();
    store.setResults([]);
    store.setTeamResults([]);
    setOptimizationError(null);
    setWorkerStatus("Préparation des runes...");
    startedAtRef.current = performance.now();

    store.setOptimizationProgress({
      running: true,
      progress: 0,
      explored: 0,
      pruned: 0,
      branches: 0,
      total: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
      monsterIndex: 0,
      monsterCount: orderedMonsters.length,
    });

    const worker = new Worker(
      new URL("./optimizerWorker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current = worker;

    worker.onerror = (event) => {
      setOptimizationError(event.message || "Erreur du worker.");
      store.setOptimizationProgress((previous) => ({
        ...previous,
        running: false,
      }));
      worker.terminate();
      workerRef.current = null;
    };

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      if (message.type === "prepared") {
        setWorkerStatus(
          `${message.preparedRuneCount.toLocaleString()} runes préparées`
        );
        return;
      }

      if (message.type === "progress") {
        const elapsedMs = performance.now() - startedAtRef.current;
        const progress = calculateProgress(
          message.explored,
          message.pruned,
          message.total
        );

        store.setOptimizationProgress({
          running: true,
          progress,
          explored: message.explored,
          pruned: message.pruned,
          branches: message.branches,
          total: message.total,
          elapsedMs,
          estimatedRemainingMs:
            progress > 0 ? (elapsedMs * (100 - progress)) / progress : 0,
          currentMonsterId: message.currentMonsterId,
          currentMonsterName: message.currentMonsterName,
          monsterIndex: message.monsterIndex + 1,
          monsterCount: message.monsterCount,
        });
        setWorkerStatus(`Optimisation de ${message.currentMonsterName}`);
        return;
      }

      if (message.type === "monster-result") {
        setWorkerStatus(
          `${message.monsterName} terminé : ${message.resultCount.toLocaleString()} builds`
        );
        return;
      }

      if (message.type === "monster-error") {
        setOptimizationError(`${message.monsterName} : ${message.error}`);
        return;
      }

      if (message.type === "team-result") {
        store.setTeamResults(message.results);
        setWorkerStatus(
          `${message.results.length.toLocaleString()} équipes compatibles conservées`
        );
        return;
      }

      store.setResults(message.results);
      store.setTeamResults(message.teamResults);
      store.setOptimizationProgress((previous) => ({
        ...previous,
        running: false,
        progress: 100,
        explored: message.summary.explored,
        pruned: message.summary.pruned,
        branches: message.summary.branches,
        elapsedMs: message.summary.totalElapsedMs,
        estimatedRemainingMs: 0,
        monsterIndex: message.summary.completedMonsterCount,
        monsterCount: message.summary.monsterCount,
      }));
      setWorkerStatus(
        message.summary.approximate
          ? "Optimisation terminée avec garde-fous actifs."
          : "Optimisation terminée."
      );
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({
      type: "optimize",
      monsters: orderedMonsters,
      configs: store.configs,
      playOrder: store.playOrder,
      runePriorityOrder: store.runePriorityOrder,
      allRunes,
    });
  };

  return (
    <div className="page">
      <header className="header">
        <h1>OptmZ</h1>

        <div className="header-actions">
          <input
            id="swex-file-input"
            className="hidden-file-input"
            type="file"
            accept=".json,application/json"
            onChange={handleImportSwex}
          />

          <button
            type="button"
            disabled={store.optimizationProgress.running}
            onClick={() => document.getElementById("swex-file-input")?.click()}
          >
            Import SWEX
          </button>

          <button
            type="button"
            disabled={!store.optimizationProgress.running}
            onClick={stopOptimization}
          >
            Stop
          </button>
        </div>
      </header>

      <div className="import-mode-container">
        {(["NORMAL", "RTA", "SIEGE"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={
              store.importMode === mode
                ? "import-mode-button active"
                : "import-mode-button"
            }
            disabled={store.optimizationProgress.running}
            onClick={() => store.setImportMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      {importStatus && (
        <div className="import-success compact">
          Import SWEX OK • {store.importMode} • {importStatus.fileName} •{" "}
          {importStatus.monsters.toLocaleString()} monstres •{" "}
          {importStatus.runes.toLocaleString()} runes •{" "}
          {importStatus.artifacts.toLocaleString()} artefacts
        </div>
      )}

      {optimizationError && (
        <div className="import-error compact">{optimizationError}</div>
      )}

      <div className="content">
        <div className="sidebar">
          <TeamPanel
            monsters={store.monsters}
            selectedMonsterId={store.selectedMonsterId}
            onSelect={store.setSelectedMonsterId}
            onDelete={store.removeMonster}
            onAdd={store.addMonster}
            availableMonsters={availableMonsters}
          />
        </div>
      </div>

      <div className="team-config-section">
        <h2>Team Configuration</h2>

        <TeamOrdersPanel
          monsters={store.monsters}
          playOrder={store.playOrder}
          runePriorityOrder={store.runePriorityOrder}
          onMovePlayOrder={store.movePlayOrderMonster}
          onMoveRunePriority={store.moveRunePriorityMonster}
        />

        <div className="team-config-cards">
          {orderedMonsters.map((monster) => {
            const config = store.configs[monster.id];
            if (!config) return null;

            return (
              <TeamMonsterCard
                key={monster.id}
                monster={monster}
                config={config}
                importMode={store.importMode}
                importedData={store.swexData}
                onDelete={() => store.removeMonster(monster.id)}
                onConfigChange={(update) =>
                  store.updateConfig(monster.id, update)
                }
              />
            );
          })}
        </div>

        <div className="optimizer-panel">
          <div className="optimizer-info">
            {store.optimizationProgress.currentMonsterName && (
              <div>
                {store.optimizationProgress.currentMonsterName} •{" "}
                {store.optimizationProgress.monsterIndex}/
                {store.optimizationProgress.monsterCount}
              </div>
            )}

            <div className="optimizer-value">
              {store.optimizationProgress.explored.toLocaleString()}
            </div>
            <div>Builds valides trouvés</div>
            <div className="optimizer-pruned">
              {store.optimizationProgress.pruned.toLocaleString()} branches
              supprimées
            </div>
            <div className="optimizer-pruned">
              {store.optimizationProgress.branches.toLocaleString()} branches
              parcourues
            </div>
            {workerStatus && (
              <div className="optimizer-status">{workerStatus}</div>
            )}
          </div>

          <div className="optimizer-circle">
            {store.optimizationProgress.progress}%
          </div>

          <button
            type="button"
            disabled={
              store.optimizationProgress.running ||
              orderedMonsters.length === 0 ||
              !store.swexData
            }
            onClick={startOptimization}
          >
            {store.optimizationProgress.running
              ? "Optimisation..."
              : "Optimize Team"}
          </button>
        </div>
      </div>

      <TeamResultsPanel results={store.teamResults} />
      <ResultsPanel results={store.results} configs={store.configs} />
    </div>
  );
}
