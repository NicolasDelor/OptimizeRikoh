import { useEffect, useMemo, useState } from "react";
import type { OptimizationResult } from "../../types/OptimizationResult";
import type { VisibleResultColumns } from "./ResultsPanel";
import RuneVisual from "./RuneVisual";

interface Props {
  results: OptimizationResult[];
  visibleColumns: VisibleResultColumns;
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
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Math.ceil(value).toLocaleString("fr-FR");
}

function compareNumbers(
  firstValue: number,
  secondValue: number,
  direction: SortDirection
): number {
  return direction === "asc"
    ? firstValue - secondValue
    : secondValue - firstValue;
}

export default function MonsterResultsTable({
  results,
  visibleColumns,
}: Props) {
  const [sortColumn, setSortColumn] = useState<SortableColumn>("spd");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const sortedResults = useMemo(() => {
    return [...results].sort((firstResult, secondResult) => {
      const comparison = compareNumbers(
        firstResult[sortColumn],
        secondResult[sortColumn],
        sortDirection
      );

      if (comparison !== 0) {
        return comparison;
      }

      for (let index = 0; index < 6; index++) {
        const firstRuneId = firstResult.runeIds[index] ?? 0;
        const secondRuneId = secondResult.runeIds[index] ?? 0;

        if (firstRuneId !== secondRuneId) {
          return firstRuneId - secondRuneId;
        }
      }

      return 0;
    });
  }, [results, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [results]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return sortedResults.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedResults, currentPage]);

  const handleSort = (column: SortableColumn): void => {
    setCurrentPage(1);

    if (sortColumn === column) {
      setSortDirection((previousDirection) =>
        previousDirection === "asc" ? "desc" : "asc"
      );
      return;
    }

    setSortColumn(column);
    setSortDirection("desc");
  };

  const getSortIcon = (column: SortableColumn): string => {
    if (sortColumn !== column) {
      return "";
    }

    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const renderSortableHeader = (column: SortableColumn, label: string) => (
    <th>
      <button
        type="button"
        className="results-sort-button"
        onClick={() => handleSort(column)}
      >
        {label}
        {getSortIcon(column)}
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

            {visibleColumns.runes && <th>RUNES</th>}
            {visibleColumns.sets && <th>SETS</th>}
            {visibleColumns.hp && renderSortableHeader("hp", "HP")}
            {visibleColumns.atk && renderSortableHeader("atk", "ATK")}
            {visibleColumns.def && renderSortableHeader("def", "DEF")}
            {visibleColumns.spd && renderSortableHeader("spd", "SPD")}
            {visibleColumns.cr && renderSortableHeader("cr", "CR")}
            {visibleColumns.cd && renderSortableHeader("cd", "DCC")}
            {visibleColumns.acc && renderSortableHeader("acc", "ACC")}
            {visibleColumns.res && renderSortableHeader("res", "RES")}
            {visibleColumns.ehp && renderSortableHeader("ehp", "EHP")}
            {visibleColumns.efficiency &&
              renderSortableHeader("efficiency", "EFF")}
            {visibleColumns.damage && renderSortableHeader("damage", "DMG")}
            {visibleColumns.slots && <th>2/4/6</th>}
          </tr>
        </thead>

        <tbody>
          {pagedResults.map((result, index) => {
            const absoluteIndex = (currentPage - 1) * PAGE_SIZE + index + 1;

            return (
              <tr key={`${result.monsterId}-${result.runeIds.join("-")}`}>
                <td>{absoluteIndex}</td>

                {visibleColumns.runes && (
                  <td>
                    <div className="result-runes">
                      {result.runes.map((rune) => (
                        <RuneVisual key={rune.id} rune={rune} />
                      ))}
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
          disabled={currentPage <= 1}
          onClick={() =>
            setCurrentPage((previousPage) => Math.max(1, previousPage - 1))
          }
        >
          ◀
        </button>

        <span>
          Page {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() =>
            setCurrentPage((previousPage) =>
              Math.min(totalPages, previousPage + 1)
            )
          }
        >
          ▶
        </button>
      </div>
    </div>
  );
}
