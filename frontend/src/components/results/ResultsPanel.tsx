import {useState} from "react";
import MonsterResultsTable from "./MonsterResultsTable";
import type {MonsterConfig} from "../../types/MonsterConfig";
import type {OptimizationResult} from "../../types/OptimizationResult";

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
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
        return "0 ms";
    }

    if (milliseconds < 1000) {
        return `${Math.round(milliseconds)} ms`;
    }

    return `${(milliseconds / 1000).toFixed(2)} s`;
}

export default function ResultsPanel({results, configs}: Props) {
    const [visibleColumns, setVisibleColumns] =
        useState<VisibleResultColumns>(DEFAULT_VISIBLE_COLUMNS);

    if (results.length === 0) {
        return null;
    }

    const toggleColumn = (column: keyof VisibleResultColumns): void => {
        setVisibleColumns((previousColumns) => ({
            ...previousColumns,
            [column]: !previousColumns[column],
        }));
    };

    return (
        <div className="card results-card">
            <h2>Results</h2>

            <div className="column-filters">
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

                                    <span>
                    {statistics.branches.toLocaleString()} branches
                  </span>

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

                            <MonsterResultsTable
                                results={monsterResult.results}
                                visibleColumns={visibleColumns}
                            />
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
