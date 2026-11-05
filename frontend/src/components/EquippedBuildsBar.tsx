import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RuneDetailsCard } from "./results/RuneVisual";
import {
  clearEquippedBuilds,
  getEquippedBuilds,
  removeEquippedBuild,
  subscribeEquippedBuilds,
  toggleBuildLock,
  type OptimizationMode,
} from "../services/equippedBuildStorage";
import {
  getSavedMode,
  MODE_CHANGE_EVENT,
} from "../services/optimizerPreferencesStorage";

interface Props {
  readonly mode?: OptimizationMode;
}

export default function EquippedBuildsBar({ mode: suppliedMode }: Props) {
  const [storedMode, setStoredMode] = useState<OptimizationMode>(() =>
    getSavedMode()
  );
  const mode = suppliedMode ?? storedMode;
  const [builds, setBuilds] = useState(() => getEquippedBuilds(mode));
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (suppliedMode) return;

    const updateMode = (event: Event): void => {
      setStoredMode((event as CustomEvent<OptimizationMode>).detail);
    };

    window.addEventListener(MODE_CHANGE_EVENT, updateMode);
    return () => window.removeEventListener(MODE_CHANGE_EVENT, updateMode);
  }, [suppliedMode]);

  useEffect(() => {
    setBuilds(getEquippedBuilds(mode));
    setSelectedMonsterId(null);

    return subscribeEquippedBuilds(() => {
      setBuilds(getEquippedBuilds(mode));
    });
  }, [mode]);

  const selected =
    builds.find((item) => item.monsterId === selectedMonsterId) ?? null;

  useEffect(() => {
    if (!selected) return;

    const closeWithEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setSelectedMonsterId(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [selected]);

  const clearBuilds = (): void => {
    if (
      !window.confirm(
        `Retirer tous les builds ${mode} équipés et verrouillés ?`
      )
    ) {
      return;
    }

    clearEquippedBuilds(mode);
    setSelectedMonsterId(null);
  };

  const sidebar = document.querySelector(".sidebar");
  const buildsBar = (
    <section className="equipped-builds-bar">
      <div className="equipped-builds-header">
        <div className="equipped-builds-title">
          Builds {mode} équipés et verrouillés
        </div>
        <button
          className="clear-equipped-builds-button"
          type="button"
          onClick={clearBuilds}
        >
          Vider les builds {mode}
        </button>
      </div>

      {builds.length > 0 ? (
        <div className="equipped-builds-list">
          {builds.map((item) => (
            <button
              className={`equipped-build-chip ${item.locked ? "is-locked" : ""}`}
              key={`${item.mode}-${item.monsterId}`}
              type="button"
              onClick={() => setSelectedMonsterId(item.monsterId)}
            >
              {item.monsterImageUrl && (
                <img src={item.monsterImageUrl} alt="" />
              )}
              <span>{item.monsterName}</span>
              <span className="equipped-build-chip-status">
                {item.locked ? "🔒 Verrouillé" : "🛡✓ Équipé"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="equipped-builds-empty">
          Aucun build {mode} équipé ou verrouillé.
        </div>
      )}
    </section>
  );

  return (
    <>
      {sidebar ? createPortal(buildsBar, sidebar) : buildsBar}

      {selected && (
        <dialog
          className="build-modal-backdrop"
          open
          aria-label={`Build ${mode} de ${selected.monsterName}`}
          onClick={(event) => {
            if (event.target === event.currentTarget)
              setSelectedMonsterId(null);
          }}
        >
          <section className="build-modal">
            <header className="build-modal-header">
              <div className="build-modal-title-group">
                {selected.monsterImageUrl && (
                  <img
                    className="build-modal-monster-image"
                    src={selected.monsterImageUrl}
                    alt=""
                  />
                )}
                <div>
                  <h2>{selected.monsterName}</h2>
                  <span>
                    {selected.mode} ·{" "}
                    {selected.locked ? "Build verrouillé" : "Build équipé"}
                  </span>
                </div>
              </div>
              <button
                className="build-modal-close"
                type="button"
                onClick={() => setSelectedMonsterId(null)}
              >
                X
              </button>
            </header>

            <div className="build-modal-runes">
              {selected.build.runes.map((rune) => (
                <RuneDetailsCard
                  key={rune.id}
                  rune={rune}
                  owner={{
                    monsterId: selected.monsterId,
                    monsterName: selected.monsterName,
                    monsterImageUrl: selected.monsterImageUrl,
                    mode: selected.mode,
                    active: true,
                    locked: selected.locked,
                  }}
                  className="build-modal-rune-card"
                />
              ))}
            </div>

            <footer className="build-modal-actions">
              <button
                type="button"
                onClick={() => toggleBuildLock(selected.monsterId, mode)}
              >
                {selected.locked ? "🔓 Déverrouiller" : "🔒 Verrouiller"}
              </button>
              <button
                type="button"
                disabled={selected.locked}
                onClick={() => {
                  removeEquippedBuild(selected.monsterId, mode);
                  setSelectedMonsterId(null);
                }}
              >
                🛡− Déséquiper
              </button>
            </footer>
          </section>
        </dialog>
      )}
    </>
  );
}
