import type { MonsterConfig } from "../../types/MonsterConfig";

interface Props {
  config: MonsterConfig;
  updateConfig: (config: Partial<MonsterConfig>) => void;
}

export default function AdvancedFilters({ config, updateConfig }: Props) {
  return (
    <div className="card">
      <h3>Advanced Filters</h3>

      <input
        type="number"
        placeholder="EHP Min"
        value={config.ehpMin || ""}
        onChange={(e) =>
          updateConfig({
            ehpMin: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        placeholder="Efficiency Min"
        value={config.efficiencyMin || ""}
        onChange={(e) =>
          updateConfig({
            efficiencyMin: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        placeholder="Speed Order"
        value={config.speedOrder || ""}
        onChange={(e) =>
          updateConfig({
            speedOrder: Number(e.target.value),
          })
        }
      />
    </div>
  );
}
