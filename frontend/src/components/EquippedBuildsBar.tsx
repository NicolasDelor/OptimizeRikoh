import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RuneDetailsCard } from "./results/RuneVisual";
import {
  clearEquippedBuilds,
  getEquippedBuilds,
  removeEquippedBuild,
  subscribeEquippedBuilds,
  toggleBuildLock,
} from "../services/equippedBuildStorage";

export default function EquippedBuildsBar() {
  const [builds, setBuilds] = useState(() => getEquippedBuilds());
  const [selectedMonsterId, setSelectedMonsterId] = useState<number | null>(
    null
  );

  useEffect(() => {
    return subscribeEquippedBuilds(() => {
      setBuilds(getEquippedBuilds());
    });
  }, []);

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
    const confirmed = window.confirm(
      "Retirer tous les builds équipés et verrouillés ? Le cache SWEX sera conservé."
    );

    if (!confirmed) return;

    clearEquippedBuilds();
    setSelectedMonsterId(null);
  };

  const sidebar = document.querySelector(".sidebar");
  const buildsBar = (
    <section className="equipped-builds-bar">
      <div className="equipped-builds-header">
        <div className="equipped-builds-title">
          Builds équipés et verrouillés
        </div>
        <button
          className="clear-equipped-builds-button"
          type="button"
          onClick={clearBuilds}
        >
          Vider les builds
        </button>
      </div>

      {builds.length > 0 ? (
        <div className="equipped-builds-list">
          {builds.map((item) => (
            <button
              className={`equipped-build-chip ${item.locked ? "is-locked" : ""}`}
              key={item.monsterId}
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
          Aucun build équipé ou verrouillé.
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
          aria-label={`Build de ${selected.monsterName}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedMonsterId(null);
            }
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
                onClick={() => toggleBuildLock(selected.monsterId)}
              >
                {selected.locked ? "🔓 Déverrouiller" : "🔒 Verrouiller"}
              </button>
              <button
                type="button"
                disabled={selected.locked}
                onClick={() => {
                  removeEquippedBuild(selected.monsterId);
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
