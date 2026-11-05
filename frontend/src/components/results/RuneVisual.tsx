import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { RuneOwnerState } from "../../services/equippedBuildStorage";
import { loadSwarfarmMonsters } from "../../services/swarfarmService";
import type { OptimizationResultRune } from "../../types/OptimizationResult";

interface Props {
  rune: OptimizationResultRune;
  owner?: RuneOwnerState | null;
}

export interface RuneDetailsCardProps {
  rune: OptimizationResultRune;
  owner?: RuneOwnerState | null;
  className?: string;
}

interface RuneEffect {
  statId: number;
  value: number;
  grind: number;
}

interface CachedRune {
  rune_id?: number;
  occupied_id?: number;
  class?: number;
  quality?: number;
  pri_eff?: unknown;
  prefix_eff?: unknown;
  sec_eff?: unknown;
}

interface CachedUnit {
  unit_id?: number;
  unit_master_id?: number;
}

interface CachedData {
  unit_list?: CachedUnit[];
  [key: string]: unknown;
}

interface SwarfarmMonsterData {
  image_filename?: string;
}

interface TooltipPosition {
  left: number;
  top: number;
}

interface TooltipData {
  cachedRune: CachedRune | null;
  monsterImageUrl: string | null;
  ownerSource: "json" | "site" | null;
}

const RUNE_SIZE = 32;
const TOOLTIP_WIDTH = 330;
const TOOLTIP_GAP = 10;
const CACHE_KEY = "swexData";

let parsedSwexCache: CachedData | null | undefined;
let parsedSwexRawValue: string | null | undefined;
let swarfarmPromise: Promise<Record<number, SwarfarmMonsterData>> | null = null;
const runeCache = new Map<number, CachedRune | null>();
const unitImageCache = new Map<number, Promise<string | null>>();

const STAT_NAMES: Record<number, string> = {
  1: "HP",
  2: "HP",
  3: "ATK",
  4: "ATK",
  5: "DEF",
  6: "DEF",
  8: "SPD",
  9: "Taux critique",
  10: "Dégâts critiques",
  11: "Résistance",
  12: "Précision",
};

const PERCENT_STATS = new Set([2, 4, 6, 9, 10, 11, 12]);

const QUALITY_NAMES: Record<number, string> = {
  1: "Normale",
  2: "Magique",
  3: "Rare",
  4: "Héroïque",
  5: "Légendaire",
};

const SET_BONUSES: Record<string, string> = {
  Accuracy: "Précision +10%",
  Blade: "Taux critique +12%",
  Despair: "Étourdissement +25%",
  Destroy: "Destruction des PV",
  Determination: "DEF alliée +8%",
  Endure: "Résistance +20%",
  Energy: "PV +15%",
  Enhance: "PV alliés +8%",
  Fatal: "ATK +35%",
  Fight: "ATK alliée +8%",
  Focus: "Précision +20%",
  Guard: "DEF +15%",
  Intangible: "Complète un set incomplet",
  Nemesis: "Jauge d'attaque +4%",
  Rage: "Dégâts critiques +40%",
  Revenge: "Contre-attaque +15%",
  Seal: "Sceau +15%",
  Shield: "Bouclier allié 15%",
  Swift: "SPD +25%",
  Tolerance: "Résistance alliée +10%",
  Vampire: "Vol de vie +35%",
  Violent: "Tour supplémentaire +22%",
  Will: "Immunité 1 tour",
};

function getSetAssetName(setName: string): string {
  return setName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readEffect(effect: unknown): RuneEffect | null {
  if (!Array.isArray(effect) || effect.length < 2) return null;

  const statId = Number(effect[0]);
  const value = Number(effect[1] ?? 0);
  const grind = Number(effect[3] ?? 0);

  if (!Number.isFinite(statId) || !Number.isFinite(value)) return null;

  return {
    statId,
    value,
    grind: Number.isFinite(grind) ? grind : 0,
  };
}

function getSwexCache(): CachedData | null {
  const rawValue = window.localStorage.getItem(CACHE_KEY);

  if (parsedSwexRawValue === rawValue && parsedSwexCache !== undefined) {
    return parsedSwexCache;
  }

  parsedSwexRawValue = rawValue;
  runeCache.clear();
  unitImageCache.clear();

  try {
    parsedSwexCache = rawValue ? (JSON.parse(rawValue) as CachedData) : null;
  } catch {
    parsedSwexCache = null;
  }

  return parsedSwexCache;
}

function findRune(value: unknown, runeId: number): CachedRune | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRune(item, runeId);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;
  if (Number(value.rune_id) === runeId) return value as CachedRune;

  for (const child of Object.values(value)) {
    if (typeof child !== "object" || child === null) continue;
    const found = findRune(child, runeId);
    if (found) return found;
  }

  return null;
}

function getCachedRune(runeId: number): CachedRune | null {
  getSwexCache();
  if (runeCache.has(runeId)) return runeCache.get(runeId) ?? null;

  const cachedRune = findRune(parsedSwexCache, runeId);
  runeCache.set(runeId, cachedRune);
  return cachedRune;
}

function resolveImportedMonsterImage(
  occupiedUnitId: number | undefined
): Promise<string | null> {
  if (!occupiedUnitId) return Promise.resolve(null);

  const existing = unitImageCache.get(occupiedUnitId);
  if (existing) return existing;

  const promise = (async (): Promise<string | null> => {
    const data = getSwexCache();
    const unit = data?.unit_list?.find(
      (candidate) => Number(candidate.unit_id) === occupiedUnitId
    );

    if (!unit?.unit_master_id) return null;

    swarfarmPromise ??= loadSwarfarmMonsters() as Promise<
      Record<number, SwarfarmMonsterData>
    >;
    const monsters = await swarfarmPromise;
    const reference = monsters[unit.unit_master_id];

    return reference?.image_filename
      ? `https://swarfarm.com/static/herders/images/monsters/${reference.image_filename}`
      : null;
  })().catch(() => null);

  unitImageCache.set(occupiedUnitId, promise);
  return promise;
}

async function loadTooltipData(
  runeId: number,
  owner: RuneOwnerState | null | undefined
): Promise<TooltipData> {
  const cachedRune = getCachedRune(runeId);

  if (owner?.active && owner.monsterImageUrl) {
    return {
      cachedRune,
      monsterImageUrl: owner.monsterImageUrl,
      ownerSource: "site",
    };
  }

  const importedMonsterImageUrl = await resolveImportedMonsterImage(
    cachedRune?.occupied_id
  );

  return {
    cachedRune,
    monsterImageUrl: importedMonsterImageUrl,
    ownerSource: importedMonsterImageUrl ? "json" : null,
  };
}

function formatEffect(effect: RuneEffect): string {
  const statName = STAT_NAMES[effect.statId] ?? `Stat ${effect.statId}`;
  const total = effect.value + effect.grind;
  const suffix = PERCENT_STATS.has(effect.statId) ? "%" : "";
  return `${statName} +${total}${suffix}`;
}

function getTooltipPosition(element: HTMLElement): TooltipPosition {
  const rect = element.getBoundingClientRect();
  const preferredLeft = rect.right + TOOLTIP_GAP;
  const fallbackLeft = rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
  const left =
    preferredLeft + TOOLTIP_WIDTH <= window.innerWidth
      ? preferredLeft
      : Math.max(8, fallbackLeft);
  const top = Math.max(8, Math.min(rect.top, window.innerHeight - 360));
  return { left, top };
}

function getQualityName(cachedRune: CachedRune | null): string {
  return QUALITY_NAMES[Number(cachedRune?.quality ?? 0)] ?? "Indisponible";
}

export function RuneDetailsCard({
  rune,
  owner,
  className = "",
}: RuneDetailsCardProps) {
  const [data, setData] = useState<TooltipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    loadTooltipData(rune.id, owner).then((loadedData) => {
      if (!active) return;
      setData(loadedData);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [rune.id, owner]);

  const cachedRune = data?.cachedRune ?? null;
  const mainStat = readEffect(cachedRune?.pri_eff);
  const innateStat = readEffect(cachedRune?.prefix_eff);
  const secondaryStats = Array.isArray(cachedRune?.sec_eff)
    ? cachedRune.sec_eff
        .map(readEffect)
        .filter((effect): effect is RuneEffect => effect !== null)
    : [];
  const quality = getQualityName(cachedRune);
  const runeStars = Math.max(
    0,
    Math.min(6, Number(cachedRune?.class ?? rune.stars ?? 0))
  );
  const setAssetName = getSetAssetName(rune.setName);

  return (
    <article className={`rune-details-card ${className}`.trim()}>
      {isLoading ? (
        <div className="rune-details-loading">Chargement de la rune...</div>
      ) : (
        <>
          <div className="rune-details-title">
            +{rune.level} Rune {rune.setName} {quality} ({rune.slot})
          </div>

          <div className="rune-details-main">
            <div className="rune-details-visual">
              <img
                src={`https://cdn.swc.gg/tool-assets/runes-img/slot${rune.slot}.png`}
                alt=""
                className="rune-details-slot"
              />
              <img
                src={`https://cdn.swc.gg/tool-assets/sets-runes-colored/legend/${setAssetName}.png`}
                alt=""
                className="rune-details-set"
              />
              {data?.monsterImageUrl && (
                <img
                  src={data.monsterImageUrl}
                  alt="Porteur de la rune"
                  className={`rune-details-owner ${
                    data.ownerSource === "site" ? "is-site" : "is-json"
                  }`}
                />
              )}
              <span className="rune-details-stars">
                {"★".repeat(runeStars)}
              </span>
            </div>

            <div className="rune-details-primary">
              {mainStat && <div>{formatEffect(mainStat)}</div>}
              {innateStat && innateStat.statId > 0 && innateStat.value > 0 && (
                <div className="rune-details-innate">
                  Innée : {formatEffect(innateStat)}
                </div>
              )}
              <div className="rune-details-quality">{quality}</div>
            </div>
          </div>

          <div className="rune-details-secondary">
            {secondaryStats.length > 0 ? (
              secondaryStats.map((effect, index) => (
                <div key={`${effect.statId}-${index}`}>
                  {formatEffect(effect)}
                  {effect.grind > 0 && (
                    <span className="rune-details-grind">{` (+${effect.grind})`}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="rune-details-empty">
                Détail indisponible dans le cache local.
              </div>
            )}
          </div>

          <div className="rune-details-bonus">
            Set : {SET_BONUSES[rune.setName] ?? rune.setName}
          </div>
        </>
      )}
    </article>
  );
}

export default function RuneVisual({ rune, owner }: Props) {
  const reference = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    top: 0,
  });
  const [ownerData, setOwnerData] = useState<TooltipData | null>(null);
  const setAssetName = getSetAssetName(rune.setName);

  useEffect(() => {
    let active = true;

    loadTooltipData(rune.id, owner).then((data) => {
      if (active) setOwnerData(data);
    });

    return () => {
      active = false;
    };
  }, [rune.id, owner]);

  const cachedRune = getCachedRune(rune.id);
  const runeStars = Math.max(
    0,
    Math.min(6, Number(cachedRune?.class ?? rune.stars ?? 0))
  );

  const openTooltip = (): void => {
    if (reference.current) setPosition(getTooltipPosition(reference.current));
    setIsVisible(true);
  };

  const closeTooltip = (): void => setIsVisible(false);

  useEffect(() => {
    if (!isVisible || !reference.current) return;

    const updatePosition = (): void => {
      if (reference.current) setPosition(getTooltipPosition(reference.current));
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible]);

  return (
    <>
      <span
        ref={reference}
        className="result-rune"
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onFocus={openTooltip}
        onBlur={closeTooltip}
        tabIndex={0}
      >
        <img
          className="result-rune-slot"
          width={RUNE_SIZE}
          height={RUNE_SIZE}
          src={`https://cdn.swc.gg/tool-assets/runes-img/slot${rune.slot}.png`}
          alt={`Rune slot ${rune.slot}`}
        />
        <img
          className="result-rune-set"
          src={`https://cdn.swc.gg/tool-assets/sets-runes-colored/legend/${setAssetName}.png`}
          alt=""
        />
        {ownerData?.monsterImageUrl && (
          <img
            className={`result-rune-owner ${
              ownerData.ownerSource === "site" ? "is-site" : "is-json"
            }`}
            src={ownerData.monsterImageUrl}
            alt=""
            title={
              ownerData.ownerSource === "site"
                ? "Équipée ou verrouillée depuis le site"
                : "Équipement provenant du JSON SWEX"
            }
          />
        )}
        <span className="result-rune-stars">{"★".repeat(runeStars)}</span>
      </span>

      {isVisible &&
        createPortal(
          <div
            role="tooltip"
            className="rune-tooltip"
            style={
              {
                "--rune-tooltip-left": `${position.left}px`,
                "--rune-tooltip-top": `${position.top}px`,
              } as CSSProperties
            }
          >
            <RuneDetailsCard rune={rune} owner={owner} />
          </div>,
          document.body
        )}
    </>
  );
}
