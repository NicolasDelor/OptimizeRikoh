import type { Monster } from "../../types/Monster";
import type { MonsterConfig, OptimizableStat } from "../../types/MonsterConfig";
import {
  getRuneBonus,
  getSetBonus,
  getStatValue,
} from "../../services/statCalculator";
import { getRunesForMode } from "../../services/runeModeService";
import { runeSetIcons } from "../../data/runeSetIcons";
import {
  runeSetDefinitions,
  runeSetIds,
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

const QUICK_BUILDS: RuneSetName[][] = [
  ["Swift", "Will"],
  ["Violent", "Will"],
  ["Violent", "Revenge"],
  ["Violent", "Nemesis"],
  ["Nemesis", "Nemesis", "Will"],
  ["Rage", "Blade"],
];

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

function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Math.ceil(value).toLocaleString("fr-FR");
}

const selectStyles: StylesConfig<SelectOption, true> = {
  control: (base) => ({
    ...base,
    backgroundColor: "#081321",
    border: "1px solid #20375f",
    minHeight: "42px",
    boxShadow: "none",
    cursor: "pointer",
  }),
  placeholder: (base) => ({ ...base, color: "#aaa" }),
  input: (base) => ({ ...base, color: "#fff" }),
  singleValue: (base) => ({ ...base, color: "#fff" }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#081321",
    border: "1px solid #20375f",
    zIndex: 99999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#1a2d4d" : "#081321",
    color: "#fff",
    cursor: "pointer",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: () => ({ display: "none" }),
  clearIndicator: () => ({ display: "none" }),
  indicatorsContainer: () => ({ display: "none" }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#16345c",
    border: "1px solid #2f6db8",
    borderRadius: "4px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#fff",
    fontSize: "11px",
    fontWeight: 600,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#fff",
    ":hover": {
      backgroundColor: "#355b94",
      color: "#fff",
    },
  }),
};

function toOptions<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((value) => ({ value, label: value.toUpperCase() }));
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

  const runeSets: RuneSetName[] = runeSetDefinitions.map(
    (definition) => definition.name
  );
  const forbiddenSets = normalizeRuneSetNames(config.forbiddenSets);
  const requiredSet1 = normalizeRuneSetNames(config.requiredSet1);
  const requiredSet2 = normalizeRuneSetNames(config.requiredSet2);
  const requiredSet3 = normalizeRuneSetNames(config.requiredSet3);
  const slot2MainStats = normalizeMainStatNames(config.slot2MainStats);
  const slot4MainStats = normalizeMainStatNames(config.slot4MainStats);
  const slot6MainStats = normalizeMainStatNames(config.slot6MainStats);
  const focusList = config.focus ?? [];

  const runeSetOptions: SelectOption<RuneSetName>[] =
    toOptions<RuneSetName>(runeSets);
  const forbiddenSetOptions: SelectOption<RuneSetName>[] =
    toOptions<RuneSetName>(forbiddenSets);

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

  const applyQuickBuild = (sets: RuneSetName[]): void => {
    onConfigChange?.({
      requiredSet1: sets[0] ? [sets[0]] : [],
      requiredSet2: sets[1] ? [sets[1]] : [],
      requiredSet3: sets[2] ? [sets[2]] : [],
    });
  };

  const updateSetSelection = (
    key: "requiredSet1" | "requiredSet2" | "requiredSet3",
    selectedOptions: MultiValue<SelectOption<RuneSetName>>
  ): void => {
    onConfigChange?.({
      [key]: selectedOptions.map((option) => option.value),
    });
  };

  const updateForbiddenSets = (
    selectedOptions: MultiValue<SelectOption<RuneSetName>>
  ): void => {
    onConfigChange?.({
      forbiddenSets: selectedOptions.map((option) => option.value),
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
    <div className="card">
      <div className="monster-card-actions">
        <button
          className="monster-delete-button"
          onClick={onDelete}
          type="button"
        >
          ✕
        </button>
      </div>

      <div className="monster-card-header">
        <div className="monster-image-placeholder">
          {monster.imageUrl && (
            <img
              src={monster.imageUrl}
              alt={monster.name}
              className="monster-image"
            />
          )}
        </div>

        <div>
          <h3>{monster.name}</h3>

          <div className="quick-builds">
            {QUICK_BUILDS.map((build) => (
              <button
                key={build.join("-")}
                type="button"
                className="quick-build-button"
                onClick={() => applyQuickBuild(build)}
              >
                {build.map((setName, index) => {
                  const setId = runeSetIds[setName];
                  const icon = runeSetIcons[setId];

                  return icon ? (
                    <img
                      key={`${setName}-${index}`}
                      src={icon}
                      alt={setName}
                      className="quick-build-icon"
                    />
                  ) : (
                    <span key={`${setName}-${index}`}>{setName}</span>
                  );
                })}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="focus-row">
        <span className="focus-label">Focus</span>

        <Select<SelectOption<OptimizableStat>, true>
          isMulti
          tabSelectsValue={false}
          closeMenuOnSelect={false}
          hideSelectedOptions
          menuPortalTarget={document.body}
          menuPosition="fixed"
          placeholder="Focus..."
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
      </div>

      <div className="search-depth-row">
        <span className="focus-label">Search Depth</span>

        <input
          className="search-depth-input"
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
      </div>

      <div className="monster-runes-configuration">
        {(
          [
            ["requiredSet1", "Set 1", requiredSet1],
            ["requiredSet2", "Set 2", requiredSet2],
            ["requiredSet3", "Set 3", requiredSet3],
          ] as const
        ).map(([key, placeholder, values]) => (
          <div className="slot-select-group" key={key}>
            <Select<SelectOption<RuneSetName>, true>
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
          </div>
        ))}
      </div>

      <div className="excluded-sets-row">
        <span className="focus-label">Sets exclus</span>

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
          value={forbiddenSetOptions}
          onChange={updateForbiddenSets}
          styles={selectStyles as StylesConfig<SelectOption<RuneSetName>, true>}
        />
      </div>

      <div className="monster-runes-configuration">
        {(
          [
            ["slot2MainStats", "Slot 2...", SLOT_2_MAIN_STATS, slot2MainStats],
            ["slot4MainStats", "Slot 4...", SLOT_4_MAIN_STATS, slot4MainStats],
            ["slot6MainStats", "Slot 6...", SLOT_6_MAIN_STATS, slot6MainStats],
          ] as const
        ).map(([key, placeholder, options, values]) => (
          <div className="slot-select-group" key={key}>
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

      <div className="monster-stats">
        <div className="stats-header">
          <div>Stat</div>
          <div>Base</div>
          <div>Current</div>
          <div>Min</div>
          <div>Max</div>
        </div>

        {stats.map((stat) => {
          const minimumKey = `${stat.key}Min` as keyof MonsterConfig["stats"];
          const maximumKey = `${stat.key}Max` as keyof MonsterConfig["stats"];

          return (
            <div key={stat.key} className="stat-row">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{formatDecimal(stat.base)}</div>
              <div className="stat-value">+{formatDecimal(stat.current)}</div>

              <input
                className="stat-input"
                type="number"
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
          );
        })}
      </div>
    </div>
  );
}
