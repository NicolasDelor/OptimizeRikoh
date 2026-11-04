import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { OptimizationResultRune } from "../../types/OptimizationResult";

interface Props {
  rune: OptimizationResultRune;
}

interface RuneEffect {
  statId: number;
  value: number;
  grind: number;
}

interface CachedRune {
  rune_id?: number;
  upgrade_curr?: number;
  class?: number;
  quality?: number;
  pri_eff?: unknown;
  prefix_eff?: unknown;
  sec_eff?: unknown;
}

interface TooltipPosition {
  left: number;
  top: number;
}

const RUNE_SIZE = 32;
const TOOLTIP_WIDTH = 330;
const TOOLTIP_GAP = 10;
const CACHE_KEY = "swexData";

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

const containerStyle: CSSProperties = {
  position: "relative",
  display: "inline-block",
  flex: `0 0 ${RUNE_SIZE}px`,
  width: RUNE_SIZE,
  minWidth: RUNE_SIZE,
  maxWidth: RUNE_SIZE,
  height: RUNE_SIZE,
  minHeight: RUNE_SIZE,
  maxHeight: RUNE_SIZE,
  overflow: "hidden",
  background: "transparent",
  verticalAlign: "middle",
  cursor: "help",
};

const imageStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "block",
  width: RUNE_SIZE,
  minWidth: RUNE_SIZE,
  maxWidth: RUNE_SIZE,
  height: RUNE_SIZE,
  minHeight: RUNE_SIZE,
  maxHeight: RUNE_SIZE,
  margin: 0,
  padding: 0,
  objectFit: "contain",
  objectPosition: "center",
  background: "transparent",
  pointerEvents: "none",
};

const starsStyle: CSSProperties = {
  position: "absolute",
  zIndex: 3,
  top: 1,
  left: "50%",
  width: 30,
  overflow: "hidden",
  transform: "translateX(-50%)",
  color: "#ff55cf",
  fontSize: 6,
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: -1,
  textAlign: "center",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  textShadow:
    "-1px -1px 0 #24051f, 1px -1px 0 #24051f, -1px 1px 0 #24051f, 1px 1px 0 #24051f",
};

const levelStyle: CSSProperties = {
  position: "absolute",
  zIndex: 3,
  right: 1,
  bottom: 1,
  color: "#fff3b0",
  fontSize: 8,
  fontWeight: 900,
  lineHeight: 1,
  pointerEvents: "none",
  textShadow:
    "-1px -1px 0 #2a1200, 1px -1px 0 #2a1200, -1px 1px 0 #2a1200, 1px 1px 0 #2a1200",
};

const tooltipStyle: CSSProperties = {
  position: "fixed",
  zIndex: 100000,
  width: TOOLTIP_WIDTH,
  padding: 14,
  border: "1px solid #7b541d",
  borderRadius: 10,
  background: "linear-gradient(180deg, #2c1a0d 0%, #1b1009 100%)",
  color: "#fff4d1",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.65)",
  pointerEvents: "none",
};

function getSetAssetName(setName: string): string {
  return setName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readEffect(effect: unknown): RuneEffect | null {
  if (!Array.isArray(effect) || effect.length < 2) {
    return null;
  }

  const statId = Number(effect[0]);
  const value = Number(effect[1] ?? 0);
  const grind = Number(effect[3] ?? 0);

  if (!Number.isFinite(statId) || !Number.isFinite(value)) {
    return null;
  }

  return {
    statId,
    value,
    grind: Number.isFinite(grind) ? grind : 0,
  };
}

function findRune(value: unknown, runeId: number): CachedRune | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRune(item, runeId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (Number(value.rune_id) === runeId) {
    return value as CachedRune;
  }

  for (const child of Object.values(value)) {
    if (typeof child !== "object" || child === null) {
      continue;
    }

    const found = findRune(child, runeId);
    if (found) {
      return found;
    }
  }

  return null;
}

function getCachedRune(runeId: number): CachedRune | null {
  try {
    const rawValue = window.localStorage.getItem(CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    return findRune(JSON.parse(rawValue) as unknown, runeId);
  } catch {
    return null;
  }
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

export default function RuneVisual({ rune }: Props) {
  const reference = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    top: 0,
  });
  const cachedRune = useMemo(() => getCachedRune(rune.id), [rune.id]);
  const setAssetName = getSetAssetName(rune.setName);

  const mainStat = readEffect(cachedRune?.pri_eff);
  const innateStat = readEffect(cachedRune?.prefix_eff);
  const secondaryStats = Array.isArray(cachedRune?.sec_eff)
    ? cachedRune.sec_eff
        .map(readEffect)
        .filter((effect): effect is RuneEffect => effect !== null)
    : [];
  const quality =
    QUALITY_NAMES[Number(cachedRune?.quality ?? 0)] ?? "Légendaire";

  useEffect(() => {
    if (!isVisible || !reference.current) {
      return;
    }

    const updatePosition = (): void => {
      if (reference.current) {
        setPosition(getTooltipPosition(reference.current));
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isVisible]);

  const tooltip = (
    <div
      role="tooltip"
      style={{
        ...tooltipStyle,
        left: position.left,
        top: position.top,
      }}
    >
      <div
        style={{
          marginBottom: 12,
          color: "#e8a43e",
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        +{rune.level} Rune {rune.setName} {quality} ({rune.slot})
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ position: "relative", width: 76, height: 76 }}>
          <img
            src={`https://cdn.swc.gg/tool-assets/runes-img/slot${rune.slot}.png`}
            alt=""
            style={{ width: 76, height: 76, objectFit: "contain" }}
          />
          <img
            src={`https://cdn.swc.gg/tool-assets/sets-runes-colored/legend/${setAssetName}.png`}
            alt=""
            style={{
              position: "absolute",
              width: 42,
              height: 42,
              left: 17,
              top: 17,
              objectFit: "contain",
            }}
          />
        </div>

        <div style={{ flex: 1, fontSize: 16, lineHeight: 1.5 }}>
          {mainStat && <div>{formatEffect(mainStat)}</div>}
          {innateStat && innateStat.statId > 0 && innateStat.value > 0 && (
            <div style={{ color: "#f5e4bb" }}>
              Innée : {formatEffect(innateStat)}
            </div>
          )}
          <div
            style={{
              display: "inline-block",
              marginTop: 7,
              padding: "3px 10px",
              borderRadius: 6,
              background: "#8c3717",
              color: "#ffd58c",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {quality}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          borderTop: "1px solid #5a381b",
          paddingTop: 10,
          fontSize: 15,
          lineHeight: 1.55,
        }}
      >
        {secondaryStats.length > 0 ? (
          secondaryStats.map((effect, index) => (
            <div key={`${effect.statId}-${index}`}>
              {formatEffect(effect)}
              {effect.grind > 0 && (
                <span style={{ color: "#64d27a" }}>
                  {` (+${effect.grind})`}
                </span>
              )}
            </div>
          ))
        ) : (
          <div style={{ color: "#b9a58d" }}>
            Détail indisponible dans le cache local.
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          borderTop: "1px solid #5a381b",
          paddingTop: 10,
          color: "#a7d63e",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        Set : {SET_BONUSES[rune.setName] ?? rune.setName}
      </div>
    </div>
  );

  return (
    <>
      <span
        ref={reference}
        className="result-rune"
        style={containerStyle}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        tabIndex={0}
      >
        <img
          className="result-rune-set"
          style={{
            ...imageStyle,
            zIndex: 2,
            inset: 6,
            width: 20,
            minWidth: 20,
            maxWidth: 20,
            height: 20,
            minHeight: 20,
            maxHeight: 20,
          }}
          width={20}
          height={20}
          src={`https://cdn.swc.gg/tool-assets/sets-runes-colored/legend/${setAssetName}.png`}
          alt=""
        />
        <img
          className="result-rune-slot"
          style={{ ...imageStyle, zIndex: 1 }}
          width={RUNE_SIZE}
          height={RUNE_SIZE}
          src={`https://cdn.swc.gg/tool-assets/runes-img/slot${rune.slot}.png`}
          alt={`Rune slot ${rune.slot}`}
        />
        <span className="result-rune-stars" style={starsStyle}>
          {"★".repeat(rune.stars)}
        </span>
        <span className="result-rune-level" style={levelStyle}>
          +{rune.level}
        </span>
      </span>

      {isVisible && createPortal(tooltip, document.body)}
    </>
  );
}
