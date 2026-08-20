import { useState } from "react";
import type { Monster } from "../../types/Monster";
import { getRuneBonus, getSetBonus, getStatValue } from "../../services/statCalculator";
import { getRunesForMode } from "../../services/runeModeService";
import { getActiveSets } from "../../services/statCalculator";
import { runeSetIcons } from "../../data/runeSetIcons";
import { runeSetNames, mainStatNames } from "../../data/runeData";


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

  const [showSets, setShowSets] = useState(false);

  const [showMainStats, setShowMainStats] = useState(false);

  const runes = getRunesForMode(
    monster,
    importMode,
    swexData
  );

    const importedSets = getActiveSets(runes)
      .map((setId) => runeSetNames[setId])
      .filter(Boolean);

    const importedSlot2 =
      mainStatNames[
        runes.find((r: any) => r.slot_no === 2)?.pri_eff?.[0]
      ] ?? "";

    const importedSlot4 =
      mainStatNames[
        runes.find((r: any) => r.slot_no === 4)?.pri_eff?.[0]
      ] ?? "";

    const importedSlot6 =
      mainStatNames[
        runes.find((r: any) => r.slot_no === 6)?.pri_eff?.[0]
      ] ?? "";

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
           <label className="move-order-label">
             Move Order
           </label>

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
           <div className="rune-filter-row">
             <span>FOCUS 1</span>

             <select
               value={config.focus?.[0] ?? "spd"}
               onChange={(e) =>
                 onConfigChange?.({
                   focus: [
                     e.target.value,
                     config.focus?.[1] ?? "acc",
                     config.focus?.[2] ?? "ehp",
                   ],
                 })
               }
             >
               {focusStats.map((stat) => (
                 <option key={stat} value={stat}>
                   {stat.toUpperCase()}
                 </option>
               ))}
             </select>
           </div>

           <div className="rune-filter-row">
             <span>FOCUS 2</span>

             <select
               value={config.focus?.[1] ?? "acc"}
               onChange={(e) =>
                 onConfigChange?.({
                   focus: [
                     config.focus?.[0] ?? "spd",
                     e.target.value,
                     config.focus?.[2] ?? "ehp",
                   ],
                 })
               }
             >
               {focusStats.map((stat) => (
                 <option key={stat} value={stat}>
                   {stat.toUpperCase()}
                 </option>
               ))}
             </select>
           </div>

           <div className="rune-filter-row">
             <span>FOCUS 3</span>

             <select
               value={config.focus?.[2] ?? "ehp"}
               onChange={(e) =>
                 onConfigChange?.({
                   focus: [
                     config.focus?.[0] ?? "spd",
                     config.focus?.[1] ?? "acc",
                     e.target.value,
                   ],
                 })
               }
             >
               {focusStats.map((stat) => (
                 <option key={stat} value={stat}>
                   {stat.toUpperCase()}
                 </option>
               ))}
             </select>
           </div>
         </div>

         <div
           className="config-summary-button"
           onClick={() => setShowSets(!showSets)}
         >
           <span>
             {showSets ? "▼" : "▶"} Sets
           </span>

           <span className="config-summary-value">
             {importedSets.join(" / ") || "Any"}

           </span>
         </div>



         {showSets && (
                    <div className="monster-runes-configuration">
                      <div className="rune-filter-row">
                        <span>SET 1</span>

                        <select
                          value={config.requiredSets?.[0] || importedSets[0] || ""}
                          onChange={(e) =>
                            onConfigChange?.({
                              requiredSets: [
                                e.target.value,
                                config.requiredSets?.[1] ?? "",
                                config.requiredSets?.[2] ?? "",
                              ],
                            })
                          }
                        >
                          <option value="">Any</option>

                          {runeSets.map((set) => (
                            <option key={set}>
                              {set}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rune-filter-row">
                        <span>SET 2</span>

                        <select
                         value={config.requiredSets?.[1] || importedSets[1] || ""}
                         onChange={(e) =>
                           onConfigChange?.({
                             requiredSets: [
                               config.requiredSets?.[0] ?? "",
                               e.target.value,
                               config.requiredSets?.[2] ?? "",
                             ],
                           })
                         }

                       >
                          <option value="">Any</option>

                          {runeSets.map((set) => (
                            <option key={set}>
                              {set}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rune-filter-row">
                        <span>SET 3</span>

                        <select
                          value={config.requiredSets?.[2] || importedSets[2] || ""}
                          onChange={(e) =>
                            onConfigChange?.({
                              requiredSets: [
                                config.requiredSets?.[0] ?? "",
                                config.requiredSets?.[1] ?? "",
                                e.target.value,
                              ],
                            })
                          }
                        >
                          <option value="">Any</option>

                          {runeSets.map((set) => (
                            <option key={set}>
                              {set}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
              <div
                className="config-summary-button"
                onClick={() => setShowMainStats(!showMainStats)}
              >
                <span>
                  {showMainStats ? "▼" : "▶"} Slots
                </span>

                <span className="config-summary-value">
                  {[
                    config.slot2MainStats?.[0] || importedSlot2,
                    config.slot4MainStats?.[0] || importedSlot4,
                    config.slot6MainStats?.[0] || importedSlot6,
                  ]
                    .filter(Boolean)
                    .join(" / ") || "Any"}
                </span>
              </div>

         {showMainStats && (
           <div className="monster-runes-configuration">
             <div className="rune-filter-row">
               <span>SLOT 1</span>

               <select
                 value={config.slot2MainStats?.[0] || importedSlot2}
                 onChange={(e) =>
                   onConfigChange?.({
                     slot2MainStats: [e.target.value],
                   })
                 }
               >
                 <option value="">Any</option>

                 {slot2MainStats.map((stat) => (
                   <option key={stat}>
                     {stat}
                   </option>
                 ))}
               </select>
             </div>

             <div className="rune-filter-row">
               <span>SLOT 2</span>

               <select
                 value={config.slot4MainStats?.[0] || importedSlot4}
                 onChange={(e) =>
                   onConfigChange?.({
                     slot4MainStats: [e.target.value],
                   })
                 }
               >
                 <option value="">Any</option>

                 {slot4MainStats.map((stat) => (
                   <option key={stat}>
                     {stat}
                   </option>
                 ))}
               </select>
             </div>

             <div className="rune-filter-row">
               <span>SLOT 3</span>

               <select
                 value={config.slot6MainStats?.[0] || importedSlot6}
                 onChange={(e) =>
                   onConfigChange?.({
                     slot6MainStats: [e.target.value],
                   })
                 }

               >
                 <option value="">Any</option>

                 {slot6MainStats.map((stat) => (
                   <option key={stat}>
                     {stat}
                   </option>
                 ))}
               </select>
             </div>
           </div>
         )}



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
              value={
                config.stats?.[`${stat.key}Min`] ?? ""
              }
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
              value={
                config.stats?.[`${stat.key}Max`] ?? ""
              }
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
