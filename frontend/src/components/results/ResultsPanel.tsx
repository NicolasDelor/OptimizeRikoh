import { useEffect, useState } from "react";
import type { Monster } from "../../types/Monster";
import type { MonsterConfig } from "../../types/MonsterConfig";
import type { OptimizationResult } from "../../types/OptimizationResult";
import {
  getBuildConflicts,
  getEquippedBuilds,
  isSameBuild,
  subscribeEquippedBuilds,
} from "../../services/equippedBuildStorage";
import MonsterResultsTable from "./MonsterResultsTable";

interface MonsterOptimizationResult {
  monsterId: number;
  monsterName: string;
  results: OptimizationResult[];
  statistics?: {
    branches: number;
    terminalBuilds: number;
    validBuilds: number;
    pruned: number;
    elapsedMs: number;
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
  readonly results: readonly MonsterOptimizationResult[];
  readonly configs: Readonly<Record<number, MonsterConfig>>;
  readonly monsters?: readonly Monster[];
  readonly importMode: "NORMAL" | "RTA" | "SIEGE";
}

const DEFAULT_COLUMNS: VisibleResultColumns = {
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

const LABELS: Record<keyof VisibleResultColumns, string> = {
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

function duration(milliseconds: number): string {
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
  const [visibleColumns, setVisibleColumns] =
    useState<VisibleResultColumns>(DEFAULT_COLUMNS);
  const [showConflictingBuilds, setShowConflictingBuilds] = useState(true);
  const [showLockedByMonster, setShowLockedByMonster] = useState<
    Record<number, boolean>
  >({});
  const [equippedBuilds, setEquippedBuilds] = useState(() =>
    getEquippedBuilds(importMode)
  );

  useEffect(() => {
    setEquippedBuilds(getEquippedBuilds(importMode));
    return subscribeEquippedBuilds(() =>
      setEquippedBuilds(getEquippedBuilds(importMode))
    );
  }, [importMode]);

  if (results.length === 0) return null;

  return (
    <div className="card results-card">
      <h2>Results · {importMode}</h2>
      <div className="column-filters">
        <label className="conflict-visibility-filter">
          <input
            type="checkbox"
            checked={showConflictingBuilds}
            onChange={(event) => setShowConflictingBuilds(event.target.checked)}
          />
          Afficher les builds utilisant des runes déjà équipées en {importMode}
        </label>
        {(Object.keys(visibleColumns) as Array<keyof VisibleResultColumns>).map(
          (column) => (
            <label key={column}>
              <input
                type="checkbox"
                checked={visibleColumns[column]}
                onChange={() =>
                  setVisibleColumns((previous) => ({
                    ...previous,
                    [column]: !previous[column],
                  }))
                }
              />
              {LABELS[column]}
            </label>
          )
        )}
      </div>

      <div className="monster-results-grid">
        {results.map((monsterResult) => {
          const config = configs[monsterResult.monsterId];
          const monster = monsters.find(
            (item) => item.id === monsterResult.monsterId
          );
          const showLocked =
            showLockedByMonster[monsterResult.monsterId] ?? true;
          const equipped = equippedBuilds.find(
            (item) =>
              item.monsterId === monsterResult.monsterId ||
              item.monsterName === monsterResult.monsterName
          );
          const visibleResults = showLocked
            ? monsterResult.results
            : monsterResult.results.filter(
                (result) =>
                  isSameBuild(equipped, result) ||
                  !getBuildConflicts(
                    result,
                    monsterResult.monsterId,
                    monsterResult.monsterName,
                    importMode
                  ).some((build) => build.locked)
              );

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

              {monsterResult.statistics && (
                <div className="results-statistics">
                  <span>
                    {monsterResult.statistics.terminalBuilds.toLocaleString()}{" "}
                    terminaux
                  </span>
                  <span>
                    {monsterResult.statistics.validBuilds.toLocaleString()}{" "}
                    valides
                  </span>
                  <span>
                    {monsterResult.statistics.branches.toLocaleString()}{" "}
                    branches
                  </span>
                  <span>{duration(monsterResult.statistics.elapsedMs)}</span>
                </div>
              )}

              <div className="column-filters monster-result-filters">
                <label className="conflict-visibility-filter">
                  <input
                    type="checkbox"
                    checked={showLocked}
                    onChange={() =>
                      setShowLockedByMonster((previous) => ({
                        ...previous,
                        [monsterResult.monsterId]: !showLocked,
                      }))
                    }
                  />
                  Afficher les builds utilisant des runes verrouillées en{" "}
                  {importMode}
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
