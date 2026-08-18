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


      const monsters =
        data.unit_list?.map((unit: any) => ({
          id: unit.unit_master_id,
          hp: unit.con,
          atk: unit.atk,
          def: unit.def,
          spd: unit.spd,
          cr: unit.critical_rate,
          cd: unit.critical_damage,
          acc: unit.accuracy,
          res: unit.resist,
        })) ?? [];

      setAvailableMonsters(
        monsters.map(
          (monster) => JSON.stringify(monster)
        )
      );

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
        <h1>OptmZ</h1>

        <div className="header-actions">
          <input
            id="swex-file-input"
            className="hidden-file-input"
            type="file"
            accept=".json"
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

      <div className="import-mode-container">
        <button
          className={
            store.importMode === "NORMAL"
              ? "import-mode-button active"
              : "import-mode-button"
          }
          onClick={() =>
            store.setImportMode("NORMAL")
          }
        >
          NORMAL
        </button>

        <button
          className={
            store.importMode === "RTA"
              ? "import-mode-button active"
              : "import-mode-button"
          }
          onClick={() =>
            store.setImportMode("RTA")
          }
        >
          RTA
        </button>

        <button
          className={
            store.importMode === "SIEGE"
              ? "import-mode-button active"
              : "import-mode-button"
          }
          onClick={() =>
            store.setImportMode("SIEGE")
          }
        >
          SIEGE
        </button>
      </div>

      {importStatus && (
        <div className="import-success">
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