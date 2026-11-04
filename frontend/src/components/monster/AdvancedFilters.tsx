import type {MonsterConfig} from "../../types/MonsterConfig";

interface Props {
    config: MonsterConfig;
    updateConfig: (config: Partial<MonsterConfig>) => void;
}

function parseOptionalNumber(value: string): number | undefined {
    if (value.trim() === "") {
        return undefined;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

export default function AdvancedFilters({
                                            config,
                                            updateConfig,
                                        }: Props) {
    const updateStatConstraint = (
        key:
            | "ehpMin"
            | "ehpMax"
            | "efficiencyMin"
            | "efficiencyMax",
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
            <h3>Advanced Filters</h3>

            <input
                type="number"
                min="0"
                placeholder="EHP Min"
                value={config.stats.ehpMin ?? ""}
                onChange={(event) =>
                    updateStatConstraint("ehpMin", event.target.value)
                }
            />

            <input
                type="number"
                min="0"
                placeholder="EHP Max"
                value={config.stats.ehpMax ?? ""}
                onChange={(event) =>
                    updateStatConstraint("ehpMax", event.target.value)
                }
            />

            <input
                type="number"
                min="0"
                placeholder="Efficiency Min"
                value={config.stats.efficiencyMin ?? ""}
                onChange={(event) =>
                    updateStatConstraint("efficiencyMin", event.target.value)
                }
            />

            <input
                type="number"
                min="0"
                placeholder="Efficiency Max"
                value={config.stats.efficiencyMax ?? ""}
                onChange={(event) =>
                    updateStatConstraint("efficiencyMax", event.target.value)
                }
            />

            <input
                type="number"
                min="1"
                placeholder="Runes candidates par slot"
                value={config.searchDepth}
                onChange={(event) =>
                    updateConfig({
                        searchDepth: Math.max(
                            1,
                            Math.floor(Number(event.target.value) || 1)
                        ),
                    })
                }
            />

            <input
                type="number"
                min="1"
                placeholder="Résultats conservés"
                value={config.resultLimit}
                onChange={(event) =>
                    updateConfig({
                        resultLimit: Math.max(
                            1,
                            Math.floor(Number(event.target.value) || 1)
                        ),
                    })
                }
            />

            <input
                type="number"
                min="1"
                placeholder="Branches maximum"
                value={config.maxBranches}
                onChange={(event) =>
                    updateConfig({
                        maxBranches: Math.max(
                            1,
                            Math.floor(Number(event.target.value) || 1)
                        ),
                    })
                }
            />

            <input
                type="number"
                min="100"
                step="100"
                placeholder="Durée maximum en millisecondes"
                value={config.maxDurationMs}
                onChange={(event) =>
                    updateConfig({
                        maxDurationMs: Math.max(
                            100,
                            Math.floor(Number(event.target.value) || 100)
                        ),
                    })
                }
            />
        </div>
    );
}
