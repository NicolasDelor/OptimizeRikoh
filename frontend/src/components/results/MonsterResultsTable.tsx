import { useEffect, useMemo, useState } from "react";
import type { OptimizationResult } from "../../types/OptimizationResult";
import type { VisibleResultColumns } from "./ResultsPanel";
import RuneVisual from "./RuneVisual";
import {
  equipBuild,
  getBuildConflicts,
  getEquippedBuilds,
  getRuneOwnerState,
  isSameBuild,
  removeEquippedBuild,
  subscribeEquippedBuilds,
  toggleBuildLock,
} from "../../services/equippedBuildStorage";

interface Props {
  results: OptimizationResult[];
  visibleColumns: VisibleResultColumns;
  monsterName: string;
  monsterImageUrl?: string;
  importMode?: "NORMAL" | "RTA" | "SIEGE";
  showConflictingBuilds: boolean;
}

type SortableColumn =
  | "hp"
  | "atk"
  | "def"
  | "spd"
  | "cr"
  | "cd"
  | "acc"
  | "res"
  | "ehp"
  | "efficiency"
  | "damage"
  | "score";

type SortDirection = "asc" | "desc";

const PAGE_SIZE = 25;

function formatDecimal(value: number): string {
  return Number.isFinite(value)
    ? Math.ceil(value).toLocaleString("fr-FR")
    : "0";
}

export default function MonsterResultsTable({
  results,
  visibleColumns,
  monsterName,
  monsterImageUrl,
  importMode = "NORMAL",
  showConflictingBuilds,
}: Props) {
  const [sortColumn, setSortColumn] = useState<SortableColumn>("spd");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [equippedBuilds, setEquippedBuilds] = useState(() =>
    getEquippedBuilds()
  );

  useEffect(() => {
    return subscribeEquippedBuilds(() => {
      setEquippedBuilds(getEquippedBuilds());
    });
  }, []);

  const sortedResults = useMemo(() => {
    const equippedForMonster = equippedBuilds.find(
      (item) =>
        item.monsterId === results[0]?.monsterId ||
        item.monsterName === monsterName
    );
    const sourceResults =
      equippedForMonster &&
      !results.some((result) => isSameBuild(equippedForMonster, result))
        ? [equippedForMonster.build, ...results]
        : [...results];

    return sourceResults
      .filter(
        (result) =>
          showConflictingBuilds ||
          getBuildConflicts(result, result.monsterId, monsterName).length ===
            0 ||
          isSameBuild(
            equippedBuilds.find((item) => item.monsterId === result.monsterId),
            result
          )
      )
      .sort((first, second) => {
        const difference =
          sortDirection === "asc"
            ? first[sortColumn] - second[sortColumn]
            : second[sortColumn] - first[sortColumn];

        if (difference !== 0) return difference;

        return first.runeIds.join("-").localeCompare(second.runeIds.join("-"));
      });
  }, [
    results,
    sortColumn,
    sortDirection,
    showConflictingBuilds,
    equippedBuilds,
    monsterName,
  ]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pagedResults = sortedResults.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleSort = (column: SortableColumn): void => {
    setCurrentPage(1);

    if (sortColumn === column) {
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("desc");
  };

  const renderHeader = (column: SortableColumn, label: string) => (
    <th>
      <button
        type="button"
        className="results-sort-button"
        onClick={() => handleSort(column)}
      >
        {label}
        {sortColumn === column ? (sortDirection === "asc" ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  if (results.length === 0) {
    return <div className="results-empty">Aucun build valide trouvé.</div>;
  }

  return (
    <div className="results-table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Action</th>
            {visibleColumns.runes && <th>RUNES</th>}
            {visibleColumns.sets && <th>SETS</th>}
            {visibleColumns.hp && renderHeader("hp", "HP")}
            {visibleColumns.atk && renderHeader("atk", "ATK")}
            {visibleColumns.def && renderHeader("def", "DEF")}
            {visibleColumns.spd && renderHeader("spd", "SPD")}
            {visibleColumns.cr && renderHeader("cr", "CR")}
            {visibleColumns.cd && renderHeader("cd", "DCC")}
            {visibleColumns.acc && renderHeader("acc", "ACC")}
            {visibleColumns.res && renderHeader("res", "RES")}
            {visibleColumns.ehp && renderHeader("ehp", "EHP")}
            {visibleColumns.efficiency && renderHeader("efficiency", "EFF")}
            {visibleColumns.damage && renderHeader("damage", "DMG")}
            {visibleColumns.slots && <th>2/4/6</th>}
          </tr>
        </thead>

        <tbody>
          {pagedResults.map((result, index) => {
            const equipped = equippedBuilds.find(
              (item) =>
                item.monsterId === result.monsterId ||
                item.monsterName === monsterName
            );
            const selected = isSameBuild(equipped, result);
            const conflicts = getBuildConflicts(
              result,
              result.monsterId,
              monsterName
            );
            const lockedConflict = conflicts.some((item) => item.locked);
            const rowClassName = selected
              ? equipped?.locked
                ? "result-row is-locked"
                : "result-row is-equipped"
              : "result-row";

            return (
              <tr
                className={rowClassName}
                key={`${result.monsterId}-${result.runeIds.join("-")}`}
              >
                <td>
                  <span className="result-row-index">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </span>

                  {selected && (
                    <span
                      className={`result-status-badge ${
                        equipped?.locked ? "locked" : "equipped"
                      }`}
                    >
                      {equipped?.locked ? "🔒 Verrouillé" : "🛡✓ Équipé"}
                    </span>
                  )}

                  {!selected && conflicts.length > 0 && (
                    <span className="result-status-badge conflict">
                      {lockedConflict ? "🔒 Conflit" : "🛡 Conflit"}
                    </span>
                  )}
                </td>

                <td>
                  <div className="build-row-actions">
                    {!selected ? (
                      <button
                        type="button"
                        className="build-action-button equip"
                        disabled={conflicts.length > 0}
                        title={
                          conflicts.length > 0
                            ? `${conflicts.length} build(s) en conflit`
                            : "Équiper ce build"
                        }
                        onClick={() =>
                          equipBuild({
                            monsterId: result.monsterId,
                            monsterName,
                            monsterImageUrl,
                            mode: importMode,
                            build: result,
                            locked: false,
                            equippedAt: Date.now(),
                          })
                        }
                      >
                        <span aria-hidden="true">🛡＋</span>
                        <span>Équiper</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="build-action-button equipped"
                          disabled={equipped?.locked}
                          title={
                            equipped?.locked
                              ? "Déverrouille le build avant de le déséquiper"
                              : "Déséquiper ce build"
                          }
                          onClick={() =>
                            removeEquippedBuild(
                              equipped?.monsterId ?? result.monsterId
                            )
                          }
                        >
                          <span aria-hidden="true">
                            {equipped?.locked ? "🛡✓" : "🛡−"}
                          </span>
                          <span>
                            {equipped?.locked ? "Équipé" : "Déséquiper"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`build-lock-button ${
                            equipped?.locked ? "is-locked" : ""
                          }`}
                          title={
                            equipped?.locked
                              ? "Déverrouiller le build"
                              : "Verrouiller le build"
                          }
                          aria-label={
                            equipped?.locked
                              ? "Déverrouiller le build"
                              : "Verrouiller le build"
                          }
                          onClick={() =>
                            toggleBuildLock(
                              equipped?.monsterId ?? result.monsterId
                            )
                          }
                        >
                          {equipped?.locked ? "🔒" : "🔓"}
                        </button>
                      </>
                    )}
                  </div>
                </td>

                {visibleColumns.runes && (
                  <td>
                    <div className="result-runes">
                      {result.runes.map((rune) => {
                        const storedOwner = getRuneOwnerState(rune.id);
                        const conflictOwner = conflicts.find((build) =>
                          build.build.runeIds.includes(rune.id)
                        );
                        const conflict = conflictOwner !== undefined;
                        const owner = storedOwner?.active ? storedOwner : null;

                        return (
                          <span
                            className={
                              conflict ? "rune-conflict-shell" : undefined
                            }
                            key={rune.id}
                            title={
                              conflict && owner
                                ? `Rune utilisée par ${owner.monsterName}`
                                : owner && !owner.active
                                  ? `Dernier porteur : ${owner.monsterName}`
                                  : undefined
                            }
                          >
                            <RuneVisual rune={rune} owner={owner} />
                          </span>
                        );
                      })}
                    </div>
                  </td>
                )}
                {visibleColumns.sets && <td>{result.sets.join(", ")}</td>}
                {visibleColumns.hp && <td>{formatDecimal(result.hp)}</td>}
                {visibleColumns.atk && <td>{formatDecimal(result.atk)}</td>}
                {visibleColumns.def && <td>{formatDecimal(result.def)}</td>}
                {visibleColumns.spd && (
                  <td className="spd-cell">{formatDecimal(result.spd)}</td>
                )}
                {visibleColumns.cr && <td>{formatDecimal(result.cr)}</td>}
                {visibleColumns.cd && <td>{formatDecimal(result.cd)}</td>}
                {visibleColumns.acc && <td>{formatDecimal(result.acc)}</td>}
                {visibleColumns.res && <td>{formatDecimal(result.res)}</td>}
                {visibleColumns.ehp && <td>{formatDecimal(result.ehp)}</td>}
                {visibleColumns.efficiency && (
                  <td>{formatDecimal(result.efficiency)}</td>
                )}
                {visibleColumns.damage && (
                  <td>{formatDecimal(result.damage)}</td>
                )}
                {visibleColumns.slots && (
                  <td>
                    {result.slot2}, {result.slot4}, {result.slot6}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
        >
          ◀
        </button>
        <span>
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() =>
            setCurrentPage((value) => Math.min(totalPages, value + 1))
          }
        >
          ▶
        </button>
      </div>
    </div>
  );
}
