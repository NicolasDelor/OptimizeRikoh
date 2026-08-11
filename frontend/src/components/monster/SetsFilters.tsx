import type { MonsterConfig } from "../../types/MonsterConfig";

interface Props {
  config: MonsterConfig;
  updateConfig: (config: Partial<MonsterConfig>) => void;
}

export default function SetsFilters({
  config,
  updateConfig,
}: Props) {
  return (
    <div className="card">
      <h3>Sets</h3>

      <input
        placeholder="Sets requis (Virage,Rage...)"
        value={config.requiredSets.join(",")}
        onChange={(e) =>
          updateConfig({
            requiredSets: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />

      <input
        placeholder="Sets interdits"
        value={config.forbiddenSets.join(",")}
        onChange={(e) =>
          updateConfig({
            forbiddenSets: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
    </div>
  );
}