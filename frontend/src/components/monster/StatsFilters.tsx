import type { MonsterConfig } from "../../types/MonsterConfig";

interface Props {
  config: MonsterConfig;
  updateConfig: (config: Partial<MonsterConfig>) => void;
}

export default function StatsFilters({ config, updateConfig }: Props) {
  const statFields = ["hp", "atk", "def", "spd", "cr", "cd", "acc", "res"];

  const updateStat = (key: string, value: number | undefined) => {
    updateConfig({
      stats: {
        ...config.stats,
        value,
      },
    });
  };

  return (
    <div className="card">
      <h3>Stats Filters</h3>

      {statFields.flatMap((stat) => [
        <input
          key={`${stat}min`}
          type="number"
          placeholder={`${stat.toUpperCase()} Min`}
          onChange={(e) =>
            updateStat(`${stat}Min`, Number(e.target.value) || undefined)
          }
        />,
        <input
          key={`${stat}max`}
          type="number"
          placeholder={`${stat.toUpperCase()} Max`}
          onChange={(e) =>
            updateStat(`${stat}Max`, Number(e.target.value) || undefined)
          }
        />,
      ])}
    </div>
  );
}
