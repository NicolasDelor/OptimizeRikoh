import TeamPanel from "../components/team/TeamPanel";
import type { MonsterConfig } from "../../types/MonsterConfig";
import ResultsPanel from "../components/results/ResultsPanel";
import { useOptimizerStore } from "../store/optimizerStore";

export default function TeamOptimizerPage() {
  const store = useOptimizerStore();

  const config =
    store.selectedMonsterId !== null
      ? store.configs[store.selectedMonsterId]
      : null;

  return (
    <div className="page">
      <header className="header">
        <h1>OptimizeRikoh</h1>

        <div className="header-actions">
          <button>Import SWEX</button>
          <button>Save</button>
          <button>Optimize Team</button>
        </div>
      </header>

      <div className="content">
        <div className="sidebar">
          <TeamPanel
            monsters={store.monsters}
            selectedMonsterId={store.selectedMonsterId}
            onSelect={store.setSelectedMonsterId}
            onDelete={store.removeMonster}
            onAdd={store.addMonster}
          />
        </div>

        <div className="main">
          {config && (
            <MonsterConfig
              config={config}
              updateConfig={(newConfig) =>
                store.updateConfig(
                  config.monsterId,
                  newConfig
                )
              }
            />
          )}
        </div>
      </div>

      <ResultsPanel />
    </div>
  );
}