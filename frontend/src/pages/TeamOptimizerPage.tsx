import { useEffect, useState } from "react";
import TeamPanel from "../components/team/TeamPanel";
import ResultsPanel from "../components/results/ResultsPanel";
import TeamMonsterCard from "../components/team/TeamMonsterCard";
import { useOptimizerStore } from "../store/optimizerStore";
import { loadSwarfarmMonsters } from "../services/swarfarmService";

export default function TeamOptimizerPage() {
  const [swarfarmMonsters, setSwarfarmMonsters] = useState<Record<number, any>>(
    {}
  );

  useEffect(() => {
    loadSwarfarmMonsters().then(setSwarfarmMonsters);
  }, []);

  const store = useOptimizerStore();

  const [importStatus, setImportStatus] = useState<{
    fileName: string;
    monsters: number;
    runes: number;
    artifacts: number;
  } | null>(null);

  const [availableMonsters, setAvailableMonsters] = useState<any[]>([]);
  const [optimizationProgress, setOptimizationProgress] = useState({
    running: false,
    explored: 0,
    pruned: 0,
    total: 0,
  });

  const [worker, setWorker] = useState<Worker | null>(null);

  const percent =
    optimizationProgress.total > 0
      ? Math.min(
          100,
          Math.round(
            ((optimizationProgress.explored + optimizationProgress.pruned) *
              100) /
              optimizationProgress.total
          )
        )
      : 0;
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

      store.setSwexData(data);

      const monsters =
        data.unit_list?.map((unit: any) => {
          const swarfarmMonster = swarfarmMonsters[unit.unit_master_id];

          const sameMonsters = data.unit_list.filter(
            (u: any) => u.unit_master_id === unit.unit_master_id
          );

          const duplicateNumber =
            sameMonsters.findIndex((u: any) => u.unit_id === unit.unit_id) + 1;

          const monsterName =
            swarfarmMonster?.name ?? String(unit.unit_master_id);

          return {
            id: unit.unit_master_id,

            unitId: unit.unit_id,

            duplicateNumber,

            baseHp: swarfarmMonster?.base_hp,

            baseAtk: swarfarmMonster?.base_attack,

            baseDef: swarfarmMonster?.base_defense,

            baseSpd: swarfarmMonster?.speed,

            name:
              duplicateNumber === 1
                ? monsterName
                : `${monsterName} ${duplicateNumber}`,

            imageUrl: swarfarmMonster
              ? `https://swarfarm.com/static/herders/images/monsters/${swarfarmMonster.image_filename}`
              : undefined,

            hp: swarfarmMonster?.base_hp ?? unit.con,
            atk: unit.atk,
            def: unit.def,
            spd: unit.spd,

            cr: unit.critical_rate,
            cd: unit.critical_damage,
            acc: unit.accuracy,
            res: unit.resist,

            runes: unit.runes ?? [],
          };
        }) ?? [];

      setAvailableMonsters(monsters);

      setImportStatus({
        fileName: file.name,
        monsters: data.unit_list?.length ?? 0,
        runes: data.runes?.length ?? 0,
        artifacts: data.artifact_list?.length ?? 0,
      });
    } catch (error) {
      console.error("IMPORT ERROR", error);

      setImportStatus({
        fileName: file.name,
        monsters: 0,
        runes: 0,
        artifacts: 0,
      });
    }
  };

  const sortedMonsters = [...store.monsters].sort((a, b) => {
    const orderA = store.configs[a.id]?.speedOrder ?? 9999;

    const orderB = store.configs[b.id]?.speedOrder ?? 9999;

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
            onClick={() => document.getElementById("swex-file-input")?.click()}
          >
            Import SWEX
          </button>

          <button>Save</button>

          <button
            onClick={() => {
              worker?.terminate();

              setOptimizationProgress((prev) => ({
                ...prev,
                running: false,
              }));
            }}
          >
            Stop
          </button>
        </div>
      </header>

      <div className="import-mode-container">
        <button
          className={
            store.importMode === "NORMAL"
              ? "import-mode-button active"
              : "import-mode-button"
          }
          onClick={() => store.setImportMode("NORMAL")}
        >
          NORMAL
        </button>

        <button
          className={
            store.importMode === "RTA"
              ? "import-mode-button active"
              : "import-mode-button"
          }
          onClick={() => store.setImportMode("RTA")}
        >
          RTA
        </button>

        <button
          className={
            store.importMode === "SIEGE"
              ? "import-mode-button active"
              : "import-mode-button"
          }
          onClick={() => store.setImportMode("SIEGE")}
        >
          SIEGE
        </button>
      </div>

      {importStatus && (
        <div className="import-success compact">
          ✅ Import SWEX OK
          {" • "}
          {store.importMode}
          {" • "}
          {importStatus.fileName}
          {" • "}
          {importStatus.monsters} monstres
          {" • "}
          {importStatus.runes} runes
          {" • "}
          {importStatus.artifacts} artefacts
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
      </div>

      <div className="team-config-section">
        <h2>Team Configuration</h2>

        <div className="team-config-cards">
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
                importMode={store.importMode}
                swexData={store.swexData}
                onDelete={() => store.removeMonster(monster.id)}
                onSpeedOrderChange={(speedOrder) =>
                  store.updateConfig(monster.id, {
                    speedOrder,
                  })
                }
                onConfigChange={(configUpdate) =>
                  store.updateConfig(monster.id, configUpdate)
                }
              />
            );
          })}
        </div>

        <div className="optimizer-panel">
          <div className="optimizer-info">
            <div className="optimizer-value">
              {optimizationProgress.explored.toLocaleString()}
            </div>

            <div>Builds trouvés</div>

            <div className="optimizer-pruned">
              {optimizationProgress.pruned.toLocaleString()} branches supprimées
            </div>
          </div>

          <div className="optimizer-circle">{percent}%</div>

          <button
            onClick={() => {
              setOptimizationProgress({
                running: true,
                explored: 0,
                pruned: 0,
                total: 0,
              });
              console.time("OPTIMIZE TEAM");
              console.log("START OPTIMIZE");
              console.log("STOCK RUNES", store.swexData?.runes?.length);

              console.log(
                "MONSTER RUNES",
                store.swexData?.unit_list?.reduce(
                  (sum: number, unit: any) => sum + (unit.runes?.length ?? 0),
                  0
                )
              );

              const allRunes = [
                ...(store.swexData?.runes ?? []),
                ...(store.swexData?.unit_list?.flatMap(
                  (unit: any) => unit.runes ?? []
                ) ?? []),
              ];
              allRunes.forEach((rune, index) => {
                rune.swopId = index + 1;
              });
              console.log("ALL RUNES", allRunes.length);

              const optimizerWorker = new Worker(
                new URL("./optimizerWorker.ts", import.meta.url),
                {
                  type: "module",
                }
              );

              setWorker(optimizerWorker);

              optimizerWorker.onmessage = (event) => {
                const data = event.data;

                if (data.type === "progress") {
                  setOptimizationProgress((prev) => ({
                    ...prev,
                    explored: data.explored,
                    pruned: data.pruned,
                    total: data.total,
                  }));

                  return;
                }

                if (data.type === "result") {
                  store.setResults(data.results);

                  setOptimizationProgress((prev) => ({
                    ...prev,
                    running: false,
                  }));

                  console.timeEnd("OPTIMIZE TEAM");
                  console.log("ALL MONSTERS DONE");

                  optimizerWorker.terminate();
                }
              };

              optimizerWorker.postMessage({
                monsters: store.monsters.filter(
                  (monster) => store.configs[monster.id]
                ),

                configs: store.configs,

                allRunes,
              });
            }}
          >
            Optimize Team
          </button>
        </div>
      </div>

      <ResultsPanel results={store.results} configs={store.configs} />
    </div>
  );
}
