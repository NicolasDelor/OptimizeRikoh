import { useState } from "react";
import TeamPanel from "../components/team/TeamPanel";
import ResultsPanel from "../components/results/ResultsPanel";
import TeamMonsterCard from "../components/team/TeamMonsterCard";
import { useOptimizerStore } from "../store/optimizerStore";

export default function TeamOptimizerPage() {
  const store = useOptimizerStore();

  const [importStatus, setImportStatus] = useState<{
    fileName: string;
    monsters: number;
    runes: number;
    artifacts: number;
  } | null>(null);

  const [availableMonsters, setAvailableMonsters] = useState<string[]>([]);

  const handleImportSwex = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      const monsterIds =
        data.unit_list?.map((unit: any) =>
          String(unit.unit_master_id)
        ) ?? [];

      setAvailableMonsters(monsterIds);

      setImportStatus({
        fileName: file.name,
        monsters: data.unit_list?.length ?? 0,
        runes: data.runes?.length ?? 0,
        artifacts: data.artifact_list?.length ?? 0,
      });

      console.log("SWEX IMPORT", data);
    } catch (error) {
      console.error(error);

      setImportStatus({
        fileName: file.name,
        monsters: 0,
        runes: 0,
        artifacts: 0,
      });
    }
  };

  const sortedMonsters = [...store.monsters].sort((a, b) => {
    const orderA =
      store.configs[a.id]?.speedOrder ?? 9999;

    const orderB =
      store.configs[b.id]?.speedOrder ?? 9999;

    return orderA - orderB;
  });

  return (
    <div className="page">
      <header className="header">
        <h1>OptimizeRikoh</h1>

        <div className="header-actions">
          <input
            id="swex-file-input"
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImportSwex}
          />

          <button
            type="button"
            onClick={() =>
              document.getElementById("swex-file-input")?.click()
            }
          >
            Import SWEX
          </button>

          <button>Save</button>
          <button>Optimize Team</button>
        </div>
      </header>

      {importStatus && (
        <div
          style={{
            backgroundColor: "#14532d",
            color: "#86efac",
            padding: "12px",
            borderRadius: "8px",
            marginTop: "12px",
            marginBottom: "12px",
            border: "1px solid #22c55e",
          }}
        >
          <strong>✅ Success</strong>

          <div>Fichier : {importStatus.fileName}</div>
          <div>Monstres : {importStatus.monsters}</div>
          <div>Runes : {importStatus.runes}</div>
          <div>Artefacts : {importStatus.artifacts}</div>
        </div>
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

        <div className="main">
          {sortedMonsters.map((monster) => {
            const config = store.configs[monster.id];

            if (!config) {
              return null;
            }

            return (
              <TeamMonsterCard
                key={monster.id}
                monster={monster}
                config={config}
                onDelete={() =>
                  store.removeMonster(monster.id)
                }
                onSpeedOrderChange={(speedOrder) =>
                  store.updateConfig(
                    monster.id,
                    {
                      speedOrder,
                    }
                  )
                }
              />
            );
          })}
        </div>
      </div>

      <ResultsPanel />
    </div>
  );
}