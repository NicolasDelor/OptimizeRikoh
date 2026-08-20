import MonsterResultsTable from "./MonsterResultsTable";
import { useState } from "react";

interface Props {
  results: any[];
  configs: Record<number, any>;
}

export default function ResultsPanel({
  results,
  configs,
}: Props) {
    console.log(
      "RESULTS PANEL RENDER",
      results.length
    );
console.log("INIT VISIBLE COLUMNS");
const [visibleColumns, setVisibleColumns] = useState({
  sets: true,
  hp: false,
  atk: false,
  def: false,
  spd: false,
  cr: false,
  cd: false,
  acc: false,
  res: false,
  ehp: false,
  slots: true,
});


  if (results.length === 0) {
    return null;
  }

  return (
    <div className="card results-card">
      <h2>Results</h2>

      <div className="column-filters">
        {Object.entries(visibleColumns).map(([key, value]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={value}
              onChange={() =>
                setVisibleColumns((prev) => ({
                  ...prev,
                  [key]:!value,
                }))
              }
            />
            {key.toUpperCase()}
          </label>
        ))}
      </div>

      <div className="monster-results-grid">
        {results.map((monsterResult) => {
          console.log(
            "RENDER RESULT",
            monsterResult.monsterName
          );

          return (
            <div
              key={monsterResult.monsterId}
              className="monster-results-section"
            >
              <div className="results-header">
                <h3>{monsterResult.monsterName}</h3>
                <span>
                  {monsterResult.results.length} builds
                </span>
              </div>

              <MonsterResultsTable
                results={monsterResult.results}
                visibleColumns={visibleColumns}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}