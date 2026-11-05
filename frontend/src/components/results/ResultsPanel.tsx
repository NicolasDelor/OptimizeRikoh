import { useEffect, useState } from "react";
import MonsterResultsTable from "./MonsterResultsTable";
import type { Monster } from "../../types/Monster";
import type { MonsterConfig } from "../../types/MonsterConfig";
import type { OptimizationResult } from "../../types/OptimizationResult";
import {
  getBuildConflicts,
  getEquippedBuilds,
  isSameBuild,
  subscribeEquippedBuilds,
} from "../../services/equippedBuildStorage";

interface MonsterOptimizationResult {
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

export interface VisibleResultColumns {
  runes: boolean;
  sets: boolean;
  hp: boolean;
  atk: boolean;
  def: boolean;
  spd: boolean;
  cr: boolean;
  cd: boolean;
  acc: boolean;
  res: boolean;
  ehp: boolean;
  efficiency: boolean;
  damage: boolean;
  slots: boolean;
}

interface Props {
  results: MonsterOptimizationResult[];
  configs: Record<number, MonsterConfig>;
  monsters?: Monster[];
  importMode: "NORMAL" | "RTA" | "SIEGE";
}

const DEFAULT_VISIBLE_COLUMNS: VisibleResultColumns = {
  runes: true,
  sets: true,
  hp: false,
  atk: false,
  def: false,
  spd: true,
  cr: false,
  cd: false,
  acc: false,
  res: false,
  ehp: false,
  efficiency: false,
  damage: false,
  slots: true,
};

const COLUMN_LABELS: Record<keyof VisibleResultColumns, string> = {
  runes: "RUNES",
  sets: "SETS",
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "SPD",
  cr: "CR",
  cd: "DCC",
  acc: "ACC",
  res: "RES",
  ehp: "EHP",
  efficiency: "EFFICIENCY",
  damage: "DÉGÂTS",
  slots: "2/4/6",
};

function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "0 ms";

  return milliseconds < 1000
    ? `${Math.round(milliseconds)} ms`
    : `${(milliseconds / 1000).toFixed(2)} s`;
}

export default function ResultsPanel({
  results,
  configs,
  monsters = [],
  importMode,
}: Props) {
  const [visibleColumns, setVisibleColumns] = useState<VisibleResultColumns>(
    DEFAULT_VISIBLE_COLUMNS
  );
  const [showConflictingBuilds, setShowConflictingBuilds] = useState(true);
  const [showLockedBuildsByMonster, setShowLockedBuildsByMonster] = useState<
    Record<number, boolean>
  >({});
  const [equippedBuilds, setEquippedBuilds] = useState(() =>
    getEquippedBuilds()
  );

  useEffect(() => {
    return subscribeEquippedBuilds(() => {
      setEquippedBuilds(getEquippedBuilds());
    });
  }, []);

  if (results.length === 0) return null;

  const toggleColumn = (column: keyof VisibleResultColumns): void => {
    setVisibleColumns((previous) => ({
      ...previous,
      [column]: !previous[column],
    }));
  };

  const toggleLockedBuilds = (monsterId: number): void => {
    setShowLockedBuildsByMonster((previous) => ({
      ...previous,
      [monsterId]: !(previous[monsterId] ?? true),
    }));
  };

  return (
    <div className="card results-card">
      <h2>Results</h2>

      <div className="column-filters">
        <label className="conflict-visibility-filter">
          <input
            type="checkbox"
            checked={showConflictingBuilds}
            onChange={(event) => setShowConflictingBuilds(event.target.checked)}
          />
          Afficher les builds utilisant des runes déjà équipées
        </label>

        {(Object.keys(visibleColumns) as Array<keyof VisibleResultColumns>).map(
          (column) => (
            <label key={column}>
              <input
                type="checkbox"
                checked={visibleColumns[column]}
                onChange={() => toggleColumn(column)}
              />
              {COLUMN_LABELS[column]}
            </label>
          )
        )}
      </div>

      <div className="monster-results-grid">
        {results.map((monsterResult) => {
          const config = configs[monsterResult.monsterId];
          const statistics = monsterResult.statistics;
          const monster = monsters.find(
            (item) => item.id === monsterResult.monsterId
          );
          const showLockedBuilds =
            showLockedBuildsByMonster[monsterResult.monsterId] ?? true;
          const equippedForMonster = equippedBuilds.find(
            (item) =>
              item.monsterId === monsterResult.monsterId ||
              item.monsterName === monsterResult.monsterName
          );
          const visibleResults = showLockedBuilds
            ? monsterResult.results
            : monsterResult.results.filter((result) => {
                if (isSameBuild(equippedForMonster, result)) return true;

                return !getBuildConflicts(
                  result,
                  monsterResult.monsterId,
                  monsterResult.monsterName
                ).some((build) => build.locked);
              });

          return (
            <section
              key={monsterResult.monsterId}
              className="monster-results-section"
            >
              <div className="results-header">
                <div>
                  <h3>{monsterResult.monsterName}</h3>

                  {config?.focus?.length > 0 && (
                    <div className="results-focus">
                      Focus :{" "}
                      {config.focus
                        .map((focus) => focus.toUpperCase())
                        .join(" → ")}
                    </div>
                  )}
                </div>

                <span className="build-count">
                  {monsterResult.results.length.toLocaleString()} builds
                  conservés
                </span>
              </div>

              {statistics && (
                <div className="results-statistics">
                  <span>
                    {statistics.terminalBuilds.toLocaleString()} builds
                    terminaux
                  </span>
                  <span>
                    {statistics.validBuilds.toLocaleString()} builds valides
                  </span>
                  <span>{statistics.branches.toLocaleString()} branches</span>
                  <span>
                    {statistics.pruned.toLocaleString()} branches supprimées
                  </span>
                  <span>{formatDuration(statistics.elapsedMs)}</span>

                  {statistics.approximate && (
                    <span className="results-approximate">
                      Résultat approximatif
                    </span>
                  )}
                </div>
              )}

              <div className="column-filters monster-result-filters">
                <label className="conflict-visibility-filter">
                  <input
                    type="checkbox"
                    checked={showLockedBuilds}
                    onChange={() => toggleLockedBuilds(monsterResult.monsterId)}
                  />
                  Afficher les builds utilisant des runes verrouillées
                </label>
              </div>

              <MonsterResultsTable
                results={visibleResults}
                visibleColumns={visibleColumns}
                monsterName={monsterResult.monsterName}
                monsterImageUrl={monster?.imageUrl}
                importMode={importMode}
                showConflictingBuilds={showConflictingBuilds}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
