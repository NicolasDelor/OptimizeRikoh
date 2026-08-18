import { useState } from "react";
import type { Monster } from "../../types/Monster";
import {
  getRuneBonus,
  getSetBonus,
  getStatValue,
} from "../../services/statCalculator";
import { getRunesForMode } from "../../services/runeModeService";

interface Props {
  monster?: Monster;
  config?: any;
  onDelete?: () => void;
  onSpeedOrderChange?: (speedOrder: number) => void;

  importMode: "NORMAL" | "RTA" | "SIEGE";
  swexData: any;
}

export default function TeamMonsterCard({
  monster,
  config,
  onDelete,
  onSpeedOrderChange,
  importMode,
  swexData,
}: Props) {
  if (!monster || !config) {
    return null;
  }

  const [values, setValues] = useState({
    hpMin: "",
    hpMax: "",
    atkMin: "",
    atkMax: "",
    defMin: "",
    defMax: "",
    spdMin: "",
    spdMax: "",
    crMin: "",
    crMax: "",
    cdMin: "",
    cdMax: "",
    accMin: "",
    accMax: "",
    resMin: "",
    resMax: "",
  });

    console.log(
      "IMPORT MODE",
      importMode
    );
    ``

  const runes = getRunesForMode(
    monster,
    importMode,
    swexData
  );

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

        <div className="monster-name">{monster.name}</div>
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
              value={values[`${stat.key}Min` as keyof typeof values]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [`${stat.key}Min`]: e.target.value,
                }))
              }
            />

            <input
              className="stat-input"
              type="text"
              inputMode="numeric"
              value={values[`${stat.key}Max` as keyof typeof values]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [`${stat.key}Max`]: e.target.value,
                }))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
