import { useEffect, useState } from "react";
import type { Monster } from "../../types/Monster";
import type { MonsterConfig, OptimizableStat } from "../../types/MonsterConfig";
import {
  getRuneBonus,
  getSetBonus,
  getStatValue,
} from "../../services/statCalculator";
import { getRunesForMode } from "../../services/runeModeService";
import {
  runeSetDefinitions,
  type MainStatName,
  type RuneSetName,
} from "../../data/runeData";
import Select, { type MultiValue, type StylesConfig } from "react-select";

interface Props {
  monster?: Monster;
  config?: MonsterConfig;
  onDelete?: () => void;
  onConfigChange?: (configUpdate: Partial<MonsterConfig>) => void;
  importMode: "NORMAL" | "RTA" | "SIEGE";
  importedData: unknown;
}

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const SLOT_2_MAIN_STATS: MainStatName[] = [
  "SPD",
  "HP%",
  "ATK%",
  "DEF%",
  "HP Flat",
  "ATK Flat",
  "DEF Flat",
];

const SLOT_4_MAIN_STATS: MainStatName[] = [
  "HP%",
  "ATK%",
  "DEF%",
  "CR",
  "CD",
  "HP Flat",
  "ATK Flat",
  "DEF Flat",
];

const SLOT_6_MAIN_STATS: MainStatName[] = [
  "HP%",
  "ATK%",
  "DEF%",
  "ACC",
  "RES",
  "HP Flat",
  "ATK Flat",
  "DEF Flat",
];

const FOCUS_STATS: OptimizableStat[] = [
  "spd",
  "hp",
  "atk",
  "def",
  "cr",
  "cd",
  "acc",
  "res",
  "ehp",
  "efficiency",
  "damage",
];

const MAX_FOCUS = 5;
const STAT_DISPLAY_EVENT = "optimizer-stat-display-change";
let showGlobalStatTotals = false;

function formatDecimal(value: number): string {
  return Number.isFinite(value)
    ? Math.ceil(value).toLocaleString("fr-FR")
    : "0";
}

const selectStyles: StylesConfig<SelectOption, true> = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    backgroundColor: "#081426",
    border: `1px solid ${state.isFocused ? "#26c6f9" : "#2a4164"}`,
    borderRadius: "7px",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(38, 198, 249, 0.12)" : "none",
    cursor: "pointer",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 7px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#7789a5",
    fontSize: "11px",
  }),
  input: (base) => ({
    ...base,
    color: "#fff",
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),
  menu: (base) => ({
    ...base,
    overflow: "hidden",
    backgroundColor: "#0b172a",
    border: "1px solid #2a4164",
    borderRadius: "7px",
    zIndex: 99999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#17375c" : "#0b172a",
    color: "#fff",
    cursor: "pointer",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: () => ({ display: "none" }),
  clearIndicator: () => ({ display: "none" }),
  indicatorsContainer: () => ({ display: "none" }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#153860",
    border: "1px solid #2e72b8",
    borderRadius: "5px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#f5f9ff",
    fontSize: "10px",
    fontWeight: 800,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#dce9f8",
    ":hover": {
      backgroundColor: "#285a91",
      color: "#fff",
    },
  }),
};

function toOptions<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((value) => ({
    value,
    label: value.toUpperCase(),
  }));
}

function isRuneSetName(value: string): value is RuneSetName {
  return runeSetDefinitions.some((definition) => definition.name === value);
}

function normalizeRuneSetNames(
  values: readonly string[] | undefined
): RuneSetName[] {
  return (values ?? []).filter(isRuneSetName);
}

function normalizeMainStatNames(
  values: readonly string[] | undefined
): MainStatName[] {
  const validMainStats = new Set<MainStatName>([
    ...SLOT_2_MAIN_STATS,
    ...SLOT_4_MAIN_STATS,
    ...SLOT_6_MAIN_STATS,
  ]);

  return (values ?? []).filter((value): value is MainStatName =>
    validMainStats.has(value as MainStatName)
  );
}

export default function TeamMonsterCard({
  monster,
  config,
  onDelete,
  onConfigChange,
  importMode,
  importedData,
}: Props) {
  if (!monster || !config) {
    return null;
  }

  const runes = getRunesForMode(monster, importMode, importedData);
  const runeSets = runeSetDefinitions.map((definition) => definition.name);
  const forbiddenSets = normalizeRuneSetNames(config.forbiddenSets);
  const requiredSet1 = normalizeRuneSetNames(config.requiredSet1);
  const requiredSet2 = normalizeRuneSetNames(config.requiredSet2);
  const requiredSet3 = normalizeRuneSetNames(config.requiredSet3);
  const slot2MainStats = normalizeMainStatNames(config.slot2MainStats);
  const slot4MainStats = normalizeMainStatNames(config.slot4MainStats);
  const slot6MainStats = normalizeMainStatNames(config.slot6MainStats);
  const focusList = config.focus ?? [];
  const runeSetOptions = toOptions<RuneSetName>(runeSets);
  const [showStatTotals, setShowStatTotals] = useState(showGlobalStatTotals);

  useEffect(() => {
    const handleStatDisplayChange = (event: Event): void => {
      const customEvent = event as CustomEvent<boolean>;
      setShowStatTotals(customEvent.detail);
    };

    window.addEventListener(STAT_DISPLAY_EVENT, handleStatDisplayChange);

    return () => {
      window.removeEventListener(STAT_DISPLAY_EVENT, handleStatDisplayChange);
    };
  }, []);

  const toggleStatDisplay = (): void => {
    showGlobalStatTotals = !showGlobalStatTotals;
    window.dispatchEvent(
      new CustomEvent<boolean>(STAT_DISPLAY_EVENT, {
        detail: showGlobalStatTotals,
      })
    );
  };

  const stats = [
    {
      key: "hp",
      label: "HP",
      base: monster.hp,
      current: getStatValue(runes, 1, 2, monster.baseHp, "hp"),
    },
    {
      key: "atk",
      label: "ATK",
      base: monster.atk,
      current: getStatValue(runes, 3, 4, monster.baseAtk, "atk"),
    },
    {
      key: "def",
      label: "DEF",
      base: monster.def,
      current: getStatValue(runes, 5, 6, monster.baseDef, "def"),
    },
    {
      key: "spd",
      label: "SPD",
      base: monster.spd,
      current:
        getRuneBonus(runes, 8) +
        (monster.baseSpd * getSetBonus(runes, "spd")) / 100,
    },
    {
      key: "cr",
      label: "CR",
      base: monster.cr,
      current: getRuneBonus(runes, 9) + getSetBonus(runes, "cr"),
    },
    {
      key: "cd",
      label: "DCC",
      base: monster.cd,
      current: getRuneBonus(runes, 10) + getSetBonus(runes, "cd"),
    },
    {
      key: "acc",
      label: "ACC",
      base: monster.acc,
      current: getRuneBonus(runes, 12) + getSetBonus(runes, "acc"),
    },
    {
      key: "res",
      label: "RES",
      base: monster.res,
      current: getRuneBonus(runes, 11) + getSetBonus(runes, "res"),
    },
  ] as const;

  const updateSetSelection = (
    key: "requiredSet1" | "requiredSet2" | "requiredSet3",
    selectedOptions: MultiValue<SelectOption<RuneSetName>>
  ): void => {
    onConfigChange?.({
      [key]: selectedOptions.map((option) => option.value),
    });
  };

  const updateMainStatSelection = (
    key: "slot2MainStats" | "slot4MainStats" | "slot6MainStats",
    selectedOptions: MultiValue<SelectOption<MainStatName>>
  ): void => {
    onConfigChange?.({
      [key]: selectedOptions.map((option) => option.value),
    });
  };

  return (
    <article className="optimizer-monster-card">
      <header className="optimizer-monster-header">
        <div className="monster-image-placeholder">
          {monster.imageUrl && (
            <img
              src={monster.imageUrl}
              alt={monster.name}
              className="monster-image"
            />
          )}
        </div>

        <h3 className="optimizer-monster-name">{monster.name}</h3>

        <button
          className="monster-delete-button"
          onClick={onDelete}
          type="button"
          aria-label={`Supprimer ${monster.name}`}
        >
          X
        </button>
      </header>

      <section className="optimizer-section optimizer-section-focus">
        <div className="optimizer-section-title">Focus</div>

        <Select<SelectOption<OptimizableStat>, true>
          inputId={`focus-${monster.id}`}
          isMulti
          tabSelectsValue={false}
          closeMenuOnSelect={false}
          hideSelectedOptions
          menuPortalTarget={document.body}
          menuPosition="fixed"
          placeholder="Sélectionner les priorités..."
          options={toOptions(FOCUS_STATS)}
          value={toOptions(focusList)}
          isOptionDisabled={() => focusList.length >= MAX_FOCUS}
          onChange={(selectedOptions) =>
            onConfigChange?.({
              focus: selectedOptions.map((option) => option.value),
            })
          }
          styles={
            selectStyles as StylesConfig<SelectOption<OptimizableStat>, true>
          }
        />
      </section>

      <section className="optimizer-section optimizer-section-sets">
        <div className="optimizer-section-title">Sets requis</div>

        <div className="optimizer-three-columns">
          {(
            [
              ["requiredSet1", "Set 1", requiredSet1],
              ["requiredSet2", "Set 2", requiredSet2],
              ["requiredSet3", "Set 3", requiredSet3],
            ] as const
          ).map(([key, placeholder, values]) => (
            <Select<SelectOption<RuneSetName>, true>
              key={key}
              isMulti
              tabSelectsValue={false}
              closeMenuOnSelect={false}
              hideSelectedOptions
              placeholder={placeholder}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              options={runeSetOptions}
              value={toOptions<RuneSetName>(values)}
              onChange={(selectedOptions) =>
                updateSetSelection(key, selectedOptions)
              }
              styles={
                selectStyles as StylesConfig<SelectOption<RuneSetName>, true>
              }
            />
          ))}
        </div>

        <div className="optimizer-subsection-label">Sets exclus</div>

        <Select<SelectOption<RuneSetName>, true>
          isMulti
          tabSelectsValue={false}
          closeMenuOnSelect={false}
          hideSelectedOptions
          placeholder="Sélectionner les sets à exclure..."
          menuPortalTarget={document.body}
          menuPosition="fixed"
          options={runeSetOptions.filter(
            (option) =>
              !requiredSet1.includes(option.value) &&
              !requiredSet2.includes(option.value) &&
              !requiredSet3.includes(option.value)
          )}
          value={toOptions(forbiddenSets)}
          onChange={(selectedOptions) =>
            onConfigChange?.({
              forbiddenSets: selectedOptions.map((option) => option.value),
            })
          }
          styles={selectStyles as StylesConfig<SelectOption<RuneSetName>, true>}
        />
      </section>

      <section className="optimizer-section optimizer-section-slots">
        <div className="optimizer-section-title">Slots 2 / 4 / 6</div>

        <div className="optimizer-three-columns optimizer-slots-grid">
          {(
            [
              ["slot2MainStats", "Slot 2", SLOT_2_MAIN_STATS, slot2MainStats],
              ["slot4MainStats", "Slot 4", SLOT_4_MAIN_STATS, slot4MainStats],
              ["slot6MainStats", "Slot 6", SLOT_6_MAIN_STATS, slot6MainStats],
            ] as const
          ).map(([key, placeholder, options, values], index) => (
            <div className="optimizer-slot-control" key={key}>
              <span className="optimizer-slot-number">{[2, 4, 6][index]}</span>

              <Select<SelectOption<MainStatName>, true>
                isMulti
                tabSelectsValue={false}
                closeMenuOnSelect={false}
                hideSelectedOptions
                placeholder={placeholder}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                options={toOptions<MainStatName>(options)}
                value={toOptions<MainStatName>(values)}
                onChange={(selectedOptions) =>
                  updateMainStatSelection(key, selectedOptions)
                }
                styles={
                  selectStyles as StylesConfig<SelectOption<MainStatName>, true>
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="optimizer-section optimizer-section-stats">
        <div className="optimizer-section-heading">
          <div className="optimizer-section-title">Statistiques</div>
          <span className="optimizer-section-hint">
            Cliquer pour afficher {showStatTotals ? "le détail" : "le total"}
          </span>
        </div>

        <div className="optimizer-stats-grid">
          {stats.map((stat) => {
            const minimumKey = `${stat.key}Min` as keyof MonsterConfig["stats"];
            const maximumKey = `${stat.key}Max` as keyof MonsterConfig["stats"];

            return (
              <div
                className={`optimizer-stat-card ${
                  showStatTotals ? "is-total" : "is-detailed"
                }`}
                key={stat.key}
                role="button"
                tabIndex={0}
                aria-label={`Basculer l'affichage de ${stat.label}`}
                onClick={toggleStatDisplay}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleStatDisplay();
                  }
                }}
              >
                <div className="optimizer-stat-summary">
                  <div className="optimizer-stat-name">{stat.label}</div>

                  <div className="optimizer-stat-current">
                    {showStatTotals
                      ? formatDecimal(stat.base + stat.current)
                      : `${formatDecimal(stat.base)} + ${formatDecimal(stat.current)}`}
                  </div>
                </div>

                <div
                  className="optimizer-stat-inputs"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <input
                    className="stat-input"
                    type="number"
                    placeholder="Min"
                    aria-label={`${stat.label} minimum`}
                    value={config.stats[minimumKey] ?? ""}
                    onChange={(event) =>
                      onConfigChange?.({
                        stats: {
                          ...config.stats,
                          [minimumKey]:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        },
                      })
                    }
                  />

                  <input
                    className="stat-input"
                    type="number"
                    placeholder="Max"
                    aria-label={`${stat.label} maximum`}
                    value={config.stats[maximumKey] ?? ""}
                    onChange={(event) =>
                      onConfigChange?.({
                        stats: {
                          ...config.stats,
                          [maximumKey]:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="optimizer-section optimizer-section-advanced">
        <div>
          <div className="optimizer-advanced-title">Réglages avancés</div>
          <div className="optimizer-advanced-description">
            Profondeur maximale de recherche
          </div>
        </div>

        <input
          id={`depth-${monster.id}`}
          className="optimizer-number-input"
          type="number"
          min="1"
          value={config.searchDepth}
          onChange={(event) =>
            onConfigChange?.({
              searchDepth: Math.max(
                1,
                Math.floor(Number(event.target.value) || 1)
              ),
            })
          }
        />
      </section>
    </article>
  );
}
