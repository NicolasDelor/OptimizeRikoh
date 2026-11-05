import type {
  EquippedBuild,
  OptimizationResult,
} from "../types/OptimizationResult";

const STORAGE_KEY = "optmz-equipped-builds-v1";
const EVENT_NAME = "optmz-equipped-builds-change";
const OWNER_HISTORY_KEY = "optmz-rune-owner-history-v1";

export interface RuneOwnerState {
  monsterId: number;
  monsterName: string;
  monsterImageUrl?: string;
  active: boolean;
  locked: boolean;
}

interface StoredRuneOwner {
  monsterId: number;
  monsterName: string;
  monsterImageUrl?: string;
}

function readOwnerHistory(): Record<number, StoredRuneOwner> {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(OWNER_HISTORY_KEY) ?? "{}"
    ) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<number, StoredRuneOwner>)
      : {};
  } catch {
    return {};
  }
}

let ownerHistory = readOwnerHistory();

function readStorage(): EquippedBuild[] {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    ) as unknown;

    return Array.isArray(parsed) ? (parsed as EquippedBuild[]) : [];
  } catch {
    return [];
  }
}

let snapshot: EquippedBuild[] = readStorage();

function publish(builds: EquippedBuild[]): void {
  snapshot = builds;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(builds));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getEquippedBuilds(): EquippedBuild[] {
  return snapshot;
}

export function subscribeEquippedBuilds(listener: () => void): () => void {
  window.addEventListener(EVENT_NAME, listener);

  return () => {
    window.removeEventListener(EVENT_NAME, listener);
  };
}

export function equipBuild(build: EquippedBuild): void {
  const currentBuild = snapshot.find(
    (item) => item.monsterId === build.monsterId
  );

  if (currentBuild?.locked) {
    return;
  }

  for (const runeId of build.build.runeIds) {
    ownerHistory[runeId] = {
      monsterId: build.monsterId,
      monsterName: build.monsterName,
      monsterImageUrl: build.monsterImageUrl,
    };
  }
  window.localStorage.setItem(OWNER_HISTORY_KEY, JSON.stringify(ownerHistory));

  publish([
    ...snapshot.filter((item) => item.monsterId !== build.monsterId),
    build,
  ]);
}

export function toggleBuildLock(monsterId: number): void {
  publish(
    snapshot.map((item) =>
      item.monsterId === monsterId ? { ...item, locked: !item.locked } : item
    )
  );
}

export function removeEquippedBuild(monsterId: number): void {
  const currentBuild = snapshot.find((item) => item.monsterId === monsterId);

  if (currentBuild?.locked) {
    return;
  }

  publish(snapshot.filter((item) => item.monsterId !== monsterId));
}

export function clearEquippedBuilds(): void {
  snapshot = [];
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getRuneOwnerState(runeId: number): RuneOwnerState | null {
  const activeBuild = snapshot.find((item) =>
    item.build.runeIds.includes(runeId)
  );

  if (activeBuild) {
    return {
      monsterId: activeBuild.monsterId,
      monsterName: activeBuild.monsterName,
      monsterImageUrl: activeBuild.monsterImageUrl,
      active: true,
      locked: activeBuild.locked,
    };
  }

  const previousOwner = ownerHistory[runeId];
  return previousOwner
    ? { ...previousOwner, active: false, locked: false }
    : null;
}

export function isSameBuild(
  equipped: EquippedBuild | undefined,
  result: OptimizationResult
): boolean {
  if (!equipped || equipped.build.runeIds.length !== result.runeIds.length) {
    return false;
  }

  const equippedRuneIds = new Set(equipped.build.runeIds);

  return result.runeIds.every((runeId) => equippedRuneIds.has(runeId));
}

export function getBuildConflicts(
  result: OptimizationResult,
  ownMonsterId: number,
  ownMonsterName?: string
): EquippedBuild[] {
  const resultRuneIds = new Set(result.runeIds);

  return snapshot.filter(
    (item) =>
      item.monsterId !== ownMonsterId &&
      item.monsterName !== ownMonsterName &&
      item.build.runeIds.some((runeId) => resultRuneIds.has(runeId))
  );
}
