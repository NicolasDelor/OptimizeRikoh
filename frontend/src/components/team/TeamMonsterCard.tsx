import { useState } from "react";

interface Props {
  monster?: {
    id: number;
    name: string;
  };
  config?: any;
  onDelete?: () => void;
  onSpeedOrderChange?: (
    speedOrder: number
  ) => void;
}

export default function TeamMonsterCard({
  monster,
  config,
  onDelete,
  onSpeedOrderChange,
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

  const stats = [
    { key: "hp", label: "HP", base: 0, current: 0 },
    { key: "atk", label: "ATK", base: 0, current: 0 },
    { key: "def", label: "DEF", base: 0, current: 0 },
    { key: "spd", label: "SPD", base: 0, current: 0 },
    { key: "cr", label: "CR", base: 15, current: 0 },
    { key: "cd", label: "CD", base: 50, current: 0 },
    { key: "acc", label: "ACC", base: 0, current: 0 },
    { key: "res", label: "RES", base: 15, current: 0 },
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
        <div className="monster-image-placeholder" />

        <div className="monster-name">
          {monster.name}
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
          onChange={(e) =>
            onSpeedOrderChange?.(
              Number(e.target.value) || 0
            )
          }
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
          <div
            key={stat.key}
            className="stat-row"
          >
            <div className="stat-label">
              {stat.label}
            </div>

            <div className="stat-value">
              {stat.base}
            </div>

            <div className="stat-value">
              +{stat.current}
            </div>

            <input
              className="stat-input"
              type="text"
              inputMode="numeric"
              value={
                values[
                  `${stat.key}Min` as keyof typeof values
                ]
              }
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
              value={
                values[
                  `${stat.key}Max` as keyof typeof values
                ]
              }
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