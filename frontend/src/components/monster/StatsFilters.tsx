import type {MonsterConfig, StatConstraints,} from "../../types/MonsterConfig";

interface Props {
    config: MonsterConfig;
    updateConfig: (config: Partial<MonsterConfig>) => void;
}

type BaseStat =
    | "hp"
    | "atk"
    | "def"
    | "spd"
    | "cr"
    | "cd"
    | "acc"
    | "res";

type StatConstraintKey = keyof StatConstraints;

const STAT_FIELDS: ReadonlyArray<{
    key: BaseStat;
    label: string;
    minimum: number;
    maximum?: number;
}> = [
    {key: "hp", label: "HP", minimum: 0},
    {key: "atk", label: "ATK", minimum: 0},
    {key: "def", label: "DEF", minimum: 0},
    {key: "spd", label: "SPD", minimum: 0},
    {key: "cr", label: "CR", minimum: 0, maximum: 100},
    {key: "cd", label: "DCC", minimum: 0},
    {key: "acc", label: "ACC", minimum: 0, maximum: 100},
    {key: "res", label: "RES", minimum: 0, maximum: 100},
];

function parseOptionalNumber(value: string): number | undefined {
    if (value.trim() === "") {
        return undefined;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

export default function StatsFilters({
                                         config,
                                         updateConfig,
                                     }: Props) {
    const updateStat = (
        key: StatConstraintKey,
        value: string
    ): void => {
        updateConfig({
            stats: {
                ...config.stats,
                [key]: parseOptionalNumber(value),
            },
        });
    };

    return (
        <div className="card">
            <h3>Stats Filters</h3>

            <div className="stats-filters-grid">
                {STAT_FIELDS.map((stat) => {
                    const minimumKey = `${stat.key}Min` as StatConstraintKey;
                    const maximumKey = `${stat.key}Max` as StatConstraintKey;

                    return (
                        <div
                            key={stat.key}
                            className="stats-filter-row"
                        >
              <span className="stats-filter-label">
                {stat.label}
              </span>

                            <input
                                type="number"
                                min={stat.minimum}
                                max={stat.maximum}
                                placeholder={`${stat.label} Min`}
                                value={config.stats[minimumKey] ?? ""}
                                onChange={(event) =>
                                    updateStat(minimumKey, event.target.value)
                                }
                            />

                            <input
                                type="number"
                                min={stat.minimum}
                                max={stat.maximum}
                                placeholder={`${stat.label} Max`}
                                value={config.stats[maximumKey] ?? ""}
                                onChange={(event) =>
                                    updateStat(maximumKey, event.target.value)
                                }
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
