import type {MonsterConfig} from "../../types/MonsterConfig";
import {runeSetDefinitions, type RuneSetName,} from "../../data/runeData";

interface Props {
    config: MonsterConfig;
    updateConfig: (config: Partial<MonsterConfig>) => void;
}

const AVAILABLE_SETS: RuneSetName[] = runeSetDefinitions
    .map((definition) => definition.name)
    .filter((setName) => setName !== "Intangible");

export default function SetsFilters({
                                        config,
                                        updateConfig,
                                    }: Props) {
    const toggleForbiddenSet = (setName: RuneSetName): void => {
        const currentForbiddenSets = config.forbiddenSets ?? [];
        const isForbidden = currentForbiddenSets.includes(setName);

        updateConfig({
            forbiddenSets: isForbidden
                ? currentForbiddenSets.filter(
                    (currentSet) => currentSet !== setName
                )
                : [...currentForbiddenSets, setName],
        });
    };

    const clearForbiddenSets = (): void => {
        updateConfig({forbiddenSets: []});
    };

    return (
        <div className="card">
            <div className="sets-filters-header">
                <h3>Sets interdits</h3>

                <button
                    type="button"
                    disabled={config.forbiddenSets.length === 0}
                    onClick={clearForbiddenSets}
                >
                    Réinitialiser
                </button>
            </div>

            <div className="sets-filters-grid">
                {AVAILABLE_SETS.map((setName) => {
                    const isForbidden = config.forbiddenSets.includes(setName);

                    return (
                        <label
                            key={setName}
                            className={
                                isForbidden
                                    ? "set-filter-option selected"
                                    : "set-filter-option"
                            }
                        >
                            <input
                                type="checkbox"
                                checked={isForbidden}
                                onChange={() => toggleForbiddenSet(setName)}
                            />

                            <span>{setName}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
