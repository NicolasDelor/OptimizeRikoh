import { useState } from "react";
import type { Monster } from "../../types/Monster";
import {
  getRuneBonus,
  getSetBonus,
  getStatValue,
} from "../../services/statCalculator";
import { getRunesForMode } from "../../services/runeModeService";
import { getActiveSets } from "../../services/statCalculator";
import { runeSetIcons } from "../../data/runeSetIcons";
import { runeSetNames, mainStatNames } from "../../data/runeData";
import Select from "react-select";

interface Props {
  monster?: Monster;
  config?: any;
  onDelete?: () => void;
  onSpeedOrderChange?: (speedOrder: number) => void;
  onConfigChange?: (configUpdate: any) => void;

  importMode: "NORMAL" | "RTA" | "SIEGE";
  swexData: any;
}

export default function TeamMonsterCard({
  monster,
  config,
  onDelete,
  onSpeedOrderChange,
  onConfigChange,
  importMode,
  swexData,
}: Props) {
  if (!monster || !config) {
    return null;
  }

  const slotStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: "#081321",
      border: "1px solid #20375f",
      minHeight: "42px",
      boxShadow: "none",
      cursor: "pointer",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#aaa",
    }),
    input: (base: any) => ({
      ...base,
      color: "#fff",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#fff",
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 99999,
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#081321",
      border: "1px solid #20375f",
      zIndex: 99999,
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#1a2d4d" : "#081321",
      color: "#fff",
      cursor: "pointer",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: () => ({
      display: "none",
    }),
    clearIndicator: () => ({
      display: "none",
    }),
    indicatorsContainer: () => ({
      display: "none",
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "#16345c",
      border: "1px solid #2f6db8",
      borderRadius: "4px",
    }),

    multiValueLabel: (base: any) => ({
      ...base,
      color: "#fff",
      fontSize: "11px",
      fontWeight: 600,
    }),

    multiValueRemove: (base: any) => ({
      ...base,
      color: "#fff",
      ":hover": {
        backgroundColor: "#355b94",
        color: "#fff",
      },
    }),
  };

  const runes = getRunesForMode(monster, importMode, swexData);

  const importedSets = getActiveSets(runes);

  const importedSet1 = importedSets[0] ? [importedSets[0]] : [];
  const importedSet2 = importedSets[1] ? [importedSets[1]] : [];
  const importedSet3 = importedSets[2] ? [importedSets[2]] : [];

  const importedSlot2 =
    mainStatNames[runes.find((r: any) => r.slot_no === 2)?.pri_eff?.[0]] ?? "";

  const importedSlot4 =
    mainStatNames[runes.find((r: any) => r.slot_no === 4)?.pri_eff?.[0]] ?? "";

  const importedSlot6 =
    mainStatNames[runes.find((r: any) => r.slot_no === 6)?.pri_eff?.[0]] ?? "";

  const getCurrentSpd = () =>
    getRuneBonus(runes, 8) + getSetBonus(runes, "spd");

  const getCurrentCr = () => getRuneBonus(runes, 9) + getSetBonus(runes, "cr");

  const getCurrentCd = () => getRuneBonus(runes, 10);

  const getCurrentRes = () =>
    getRuneBonus(runes, 11) + getSetBonus(runes, "res");

  const getCurrentAcc = () =>
    getRuneBonus(runes, 12) + getSetBonus(runes, "acc");

  const stats = [
    {
      key: "hp",
      label: "HP",
      base: monster.hp,
      current: getStatValue(runes, 1, 2, monster.baseHp ?? monster.hp, "hp"),
    },
    {
      key: "atk",
      label: "ATK",
      base: monster.atk,
      current: getStatValue(runes, 3, 4, monster.baseAtk ?? monster.atk, "atk"),
    },
    {
      key: "def",
      label: "DEF",
      base: monster.def,
      current: getStatValue(runes, 5, 6, monster.baseDef ?? monster.def, "def"),
    },
    {
      key: "spd",
      label: "SPD",
      base: monster.spd,
      current: getCurrentSpd(),
    },
    {
      key: "cr",
      label: "CR",
      base: monster.cr,
      current: getCurrentCr(),
    },
    {
      key: "cd",
      label: "CD",
      base: monster.cd,
      current: getCurrentCd(),
    },
    {
      key: "acc",
      label: "ACC",
      base: monster.acc,
      current: getCurrentAcc(),
    },
    {
      key: "res",
      label: "RES",
      base: monster.res,
      current: getCurrentRes(),
    },
  ];

  const runeSets = [
    "Violent",
    "Will",
    "Swift",
    "Despair",
    "Rage",
    "Blade",
    "Focus",
    "Guard",
    "Nemesis",
    "Revenge",
    "Destroy",
    "Shield",
    "Endure",
    "Fight",
    "Determination",
    "Enhance",
    "Accuracy",
    "Tolerance",
    "Seal",
    "Intangible",
  ];

  const slot2MainStats = [
    "SPD",
    "HP%",
    "ATK%",
    "DEF%",
    "HP Flat",
    "ATK Flat",
    "DEF Flat",
  ];

  const slot4MainStats = [
    "HP%",
    "ATK%",
    "DEF%",
    "CR",
    "CD",
    "HP Flat",
    "ATK Flat",
    "DEF Flat",
  ];

  const slot6MainStats = [
    "HP%",
    "ATK%",
    "DEF%",
    "ACC",
    "RES",
    "HP Flat",
    "ATK Flat",
    "DEF Flat",
  ];

  const focusStats = [
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
  ];

  const focusList = config.focus ?? [];
  const MAX_FOCUS = 5;

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
          <div className="monster-name">{monster.name}</div>
          <div className="monster-rune-sets">
            {getActiveSets(runes).map((setId, index) => (
              <img
                key={`${setId}-${index}`}
                src={runeSetIcons[setId]}
                alt={setId}
                className="rune-set-icon"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="move-order-container">
        <label className="move-order-label">Move Order</label>

        <input
          className="move-order-input"
          type="text"
          inputMode="numeric"
          value={config.speedOrder ?? ""}
          onChange={(e) => {
            const value = Number(e.target.value);

            if (!Number.isNaN(value) && value >= 1) {
              onSpeedOrderChange?.(value);
            }
          }}
        />
      </div>

      <div className="monster-runes-configuration">
        <div className="slot-select-group">
          <Select
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions
            placeholder="Set 1"
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={runeSets.map((set) => ({
              value: set,
              label: set,
            }))}
            value={(config.requiredSet1 ?? importedSet1).map((set: string) => ({
              value: set,
              label: set,
            }))}
            onChange={(selectedOptions) =>
              onConfigChange?.({
                requiredSet1: selectedOptions
                  ? selectedOptions.map((o: any) => o.value)
                  : [],
              })
            }
            styles={slotStyles}
          />
        </div>

        <div className="slot-select-group">
          <Select
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions
            placeholder="Set 2"
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={runeSets.map((set) => ({
              value: set,
              label: set,
            }))}
            value={(config.requiredSet2 ?? importedSet2).map((set: string) => ({
              value: set,
              label: set,
            }))}
            onChange={(selectedOptions) =>
              onConfigChange?.({
                requiredSet2: selectedOptions
                  ? selectedOptions.map((o: any) => o.value)
                  : [],
              })
            }
            styles={slotStyles}
          />
        </div>

        <div className="slot-select-group">
          <Select
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions
            placeholder="Set 3"
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={runeSets.map((set) => ({
              value: set,
              label: set,
            }))}
            value={(config.requiredSet3 ?? importedSet3).map((set: string) => ({
              value: set,
              label: set,
            }))}
            onChange={(selectedOptions) =>
              onConfigChange?.({
                requiredSet3: selectedOptions
                  ? selectedOptions.map((o: any) => o.value)
                  : [],
              })
            }
            styles={slotStyles}
          />
        </div>
      </div>
      <div className="monster-runes-configuration">
        <div className="slot-select-group">
          <Select
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions
            placeholder="Slot 2..."
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={slot2MainStats.map((stat) => ({
              value: stat,
              label: stat,
            }))}
            value={(
              config.slot2MainStats ?? (importedSlot2 ? [importedSlot2] : [])
            ).map((stat: string) => ({
              value: stat,
              label: stat,
            }))}
            onChange={(selectedOptions) =>
              onConfigChange?.({
                slot2MainStats: selectedOptions
                  ? selectedOptions.map((o: any) => o.value)
                  : [],
              })
            }
            styles={slotStyles}
          />
        </div>

        <div className="slot-select-group">
          <Select
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions
            placeholder="Slot 4..."
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={slot4MainStats.map((stat) => ({
              value: stat,
              label: stat,
            }))}
            value={(
              config.slot4MainStats ?? (importedSlot4 ? [importedSlot4] : [])
            ).map((stat: string) => ({
              value: stat,
              label: stat,
            }))}
            onChange={(selectedOptions) =>
              onConfigChange?.({
                slot4MainStats: selectedOptions
                  ? selectedOptions.map((o: any) => o.value)
                  : [],
              })
            }
            styles={slotStyles}
          />
        </div>
        <div className="slot-select-group">
          <Select
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions
            placeholder="Slot 6..."
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={slot6MainStats.map((stat) => ({
              value: stat,
              label: stat,
            }))}
            value={(
              config.slot6MainStats ?? (importedSlot6 ? [importedSlot6] : [])
            ).map((stat: string) => ({
              value: stat,
              label: stat,
            }))}
            onChange={(selectedOptions) =>
              onConfigChange?.({
                slot6MainStats: selectedOptions
                  ? selectedOptions.map((o: any) => o.value)
                  : [],
              })
            }
            styles={slotStyles}
          />
        </div>
      </div>
      <div className="focus-panel">
        <Select
          isMulti
          closeMenuOnSelect={false}
          hideSelectedOptions
          placeholder="Focus"
          menuPortalTarget={document.body}
          menuPosition="fixed"
          options={focusStats.map((stat) => ({
            value: stat,
            label: stat.toUpperCase(),
          }))}
          value={focusList.map((stat: string) => ({
            value: stat,
            label: stat.toUpperCase(),
          }))}
          onChange={(selectedOptions) => {
            onConfigChange?.({
              focus: selectedOptions
                ? selectedOptions.map((option: any) => option.value)
                : [],
            });
          }}
          styles={slotStyles}
        />
      </div>

      <div className="monster-stats">
        <div className="stats-header">
          <div>Stat</div>
          <div>Base</div>
          <div>Current</div>
          <div>Min</div>
          <div>Max</div>
        </div>

        {stats.map((stat) => (
          <div key={stat.key} className="stat-row">
            <div className="stat-label">{stat.label}</div>

            <div className="stat-value">{stat.base}</div>

            <div className="stat-value">+{stat.current}</div>

            <input
              className="stat-input"
              type="text"
              inputMode="numeric"
              value={config.stats?.[`${stat.key}Min`] ?? ""}
              onChange={(e) =>
                onConfigChange?.({
                  stats: {
                    ...config.stats,
                    [`${stat.key}Min`]:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  },
                })
              }
            />

            <input
              className="stat-input"
              type="text"
              inputMode="numeric"
              value={config.stats?.[`${stat.key}Max`] ?? ""}
              onChange={(e) =>
                onConfigChange?.({
                  stats: {
                    ...config.stats,
                    [`${stat.key}Max`]:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  },
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
