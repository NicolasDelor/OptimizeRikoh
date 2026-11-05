import { useEffect, useMemo, useState } from "react";
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
import type { OptimizationResult } from "../../types/OptimizationResult";
import type { VisibleResultColumns } from "./ResultsPanel";
import RuneVisual from "./RuneVisual";

interface Props {
  readonly results: readonly OptimizationResult[];
  readonly visibleColumns: Readonly<VisibleResultColumns>;
  readonly monsterName: string;
  readonly monsterImageUrl?: string;
  readonly importMode: "NORMAL" | "RTA" | "SIEGE";
  readonly showConflictingBuilds: boolean;
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

function format(value: number): string {
  return Number.isFinite(value)
    ? Math.ceil(value).toLocaleString("fr-FR")
    : "0";
}

export default function MonsterResultsTable({
  results,
  visibleColumns,
  monsterName,
  monsterImageUrl,
  importMode,
  showConflictingBuilds,
}: Props) {
  const [sortColumn, setSortColumn] = useState<SortableColumn>("spd");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [equippedBuilds, setEquippedBuilds] = useState(() =>
    getEquippedBuilds(importMode)
  );

  useEffect(() => {
    setEquippedBuilds(getEquippedBuilds(importMode));
    return subscribeEquippedBuilds(() =>
      setEquippedBuilds(getEquippedBuilds(importMode))
    );
  }, [importMode]);

  const sortedResults = useMemo(() => {
    const equippedForMonster = equippedBuilds.find(
      (item) =>
        item.monsterId === results[0]?.monsterId ||
        item.monsterName === monsterName
    );
    const source =
      equippedForMonster &&
      !results.some((result) => isSameBuild(equippedForMonster, result))
        ? [equippedForMonster.build, ...results]
        : [...results];

    return source
      .filter(
        (result) =>
          showConflictingBuilds ||
          getBuildConflicts(result, result.monsterId, monsterName, importMode)
            .length === 0 ||
          isSameBuild(equippedForMonster, result)
      )
      .sort((first, second) => {
        const difference =
          sortDirection === "asc"
            ? first[sortColumn] - second[sortColumn]
            : second[sortColumn] - first[sortColumn];
        return (
          difference ||
          first.runeIds.join("-").localeCompare(second.runeIds.join("-"))
        );
      });
  }, [
    results,
    sortColumn,
    sortDirection,
    showConflictingBuilds,
    equippedBuilds,
    monsterName,
    importMode,
  ]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pagedResults = sortedResults.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const sort = (column: SortableColumn): void => {
    setCurrentPage(1);
    if (sortColumn === column) {
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const header = (column: SortableColumn, label: string) => (
    <th>
      <button
        type="button"
        className="results-sort-button"
        onClick={() => sort(column)}
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
            {visibleColumns.hp && header("hp", "HP")}
            {visibleColumns.atk && header("atk", "ATK")}
            {visibleColumns.def && header("def", "DEF")}
            {visibleColumns.spd && header("spd", "SPD")}
            {visibleColumns.cr && header("cr", "CR")}
            {visibleColumns.cd && header("cd", "DCC")}
            {visibleColumns.acc && header("acc", "ACC")}
            {visibleColumns.res && header("res", "RES")}
            {visibleColumns.ehp && header("ehp", "EHP")}
            {visibleColumns.efficiency && header("efficiency", "EFF")}
            {visibleColumns.damage && header("damage", "DMG")}
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
              monsterName,
              importMode
            );
            let rowClassName = "result-row";
            if (selected && equipped?.locked)
              rowClassName = "result-row is-locked";
            else if (selected) rowClassName = "result-row is-equipped";

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
                      className={`result-status-badge ${equipped?.locked ? "locked" : "equipped"}`}
                    >
                      {equipped?.locked ? "🔒 Verrouillé" : "🛡✓ Équipé"}
                    </span>
                  )}
                  {!selected && conflicts.length > 0 && (
                    <span className="result-status-badge conflict">
                      Conflit {importMode}
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
                        🛡＋ Équiper
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="build-action-button equipped"
                          disabled={equipped?.locked}
                          onClick={() =>
                            removeEquippedBuild(result.monsterId, importMode)
                          }
                        >
                          🛡− Déséquiper
                        </button>
                        <button
                          type="button"
                          className={`build-lock-button ${equipped?.locked ? "is-locked" : ""}`}
                          onClick={() =>
                            toggleBuildLock(result.monsterId, importMode)
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
                        const owner = getRuneOwnerState(rune.id, importMode);
                        const conflict = conflicts.some((build) =>
                          build.build.runeIds.includes(rune.id)
                        );
                        return (
                          <span
                            className={
                              conflict ? "rune-conflict-shell" : undefined
                            }
                            key={rune.id}
                            title={
                              conflict && owner
                                ? `Rune utilisée par ${owner.monsterName} en ${importMode}`
                                : undefined
                            }
                          >
                            <RuneVisual
                              rune={rune}
                              owner={owner?.active ? owner : null}
                            />
                          </span>
                        );
                      })}
                    </div>
                  </td>
                )}
                {visibleColumns.sets && <td>{result.sets.join(", ")}</td>}
                {visibleColumns.hp && <td>{format(result.hp)}</td>}
                {visibleColumns.atk && <td>{format(result.atk)}</td>}
                {visibleColumns.def && <td>{format(result.def)}</td>}
                {visibleColumns.spd && (
                  <td className="spd-cell">{format(result.spd)}</td>
                )}
                {visibleColumns.cr && <td>{format(result.cr)}</td>}
                {visibleColumns.cd && <td>{format(result.cd)}</td>}
                {visibleColumns.acc && <td>{format(result.acc)}</td>}
                {visibleColumns.res && <td>{format(result.res)}</td>}
                {visibleColumns.ehp && <td>{format(result.ehp)}</td>}
                {visibleColumns.efficiency && (
                  <td>{format(result.efficiency)}</td>
                )}
                {visibleColumns.damage && <td>{format(result.damage)}</td>}
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
