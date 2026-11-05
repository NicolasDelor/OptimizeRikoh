import type { MonsterConfig } from "../types/MonsterConfig";

export type OptimizationMode = "NORMAL" | "RTA" | "SIEGE";

const MODE_KEY = "optmz-import-mode-v1";
const CONFIGS_KEY = "optmz-monster-configs-v1";
export const MODE_CHANGE_EVENT = "optmz-import-mode-change";

type StoredConfigs = Record<string, Omit<MonsterConfig, "monsterId">>;

function configKey(unitId: number, mode: OptimizationMode): string {
  return `${mode}:${unitId}`;
}

function readConfigs(): StoredConfigs {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CONFIGS_KEY) ?? "{}"
    ) as unknown;

    return parsed && typeof parsed === "object"
      ? (parsed as StoredConfigs)
      : {};
  } catch {
    return {};
  }
}

export function getSavedMode(): OptimizationMode {
  const mode = window.localStorage.getItem(MODE_KEY);
  return mode === "RTA" || mode === "SIEGE" ? mode : "NORMAL";
}

export function saveMode(mode: OptimizationMode): void {
  window.localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent<OptimizationMode>(MODE_CHANGE_EVENT, { detail: mode })
  );
}

export function loadMonsterConfig(
  unitId: number,
  monsterId: number,
  mode: OptimizationMode
): MonsterConfig | null {
  const stored = readConfigs()[configKey(unitId, mode)];
  return stored ? { ...stored, monsterId } : null;
}

export function saveMonsterConfig(
  unitId: number,
  mode: OptimizationMode,
  config: MonsterConfig
): void {
  const configs = readConfigs();
  const { monsterId: _monsterId, ...persistedConfig } = config;
  configs[configKey(unitId, mode)] = persistedConfig;
  window.localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs));
}

export function removeSavedMonsterConfig(
  unitId: number,
  mode: OptimizationMode
): void {
  const configs = readConfigs();
  delete configs[configKey(unitId, mode)];
  window.localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs));
}
