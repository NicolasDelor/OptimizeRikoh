import type { OptimizationResult } from "../../types/OptimizationResult";
import { useState } from "react";

interface Props {
  results: OptimizationResult[];

  visibleColumns: {
    sets: boolean;
    hp: boolean;
    atk: boolean;
    def: boolean;
    spd: boolean;
    cr: boolean;
    cd: boolean;
    acc: boolean;
    res: boolean;
    ehp: boolean;
    efficiency: boolean;
    slots: boolean;
  };
}

export default function MonsterResultsTable({
  results,
  visibleColumns,
}: Props) {

    console.log(
      "TABLE RENDER",
      results.length
    );


  const [sortColumn, setSortColumn] =
    useState<keyof OptimizationResult>("spd");

  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("desc");

    const PAGE_SIZE = 10;

    const [currentPage, setCurrentPage] =
      useState(1);

  function handleSort(
    column: keyof OptimizationResult
  ) {
      setCurrentPage(1);
    if (sortColumn === column) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  function getSortIcon(
    column: keyof OptimizationResult
  ) {
    if (sortColumn !== column) {
      return "";
    }

    return sortDirection === "asc"
      ? " ▲"
      : " ▼";
  }

  const sortedResults = [...results].sort((a, b) => {
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (
      typeof aValue === "number" &&
      typeof bValue === "number"
    ) {
      return sortDirection === "asc"
        ? aValue - bValue
        : bValue - aValue;
    }

    return sortDirection === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

    const totalPages = Math.ceil(
      sortedResults.length / PAGE_SIZE
    );

    const pagedResults = sortedResults.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );


  return (
    <div className="results-table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>

            {visibleColumns.sets && (
              <th>SETS</th>
            )}

            {visibleColumns.hp && (
              <th onClick={() => handleSort("hp")}>
                HP{getSortIcon("hp")}
              </th>
            )}

            {visibleColumns.atk && (
              <th onClick={() => handleSort("atk")}>
                ATK{getSortIcon("atk")}
              </th>
            )}

            {visibleColumns.def && (
              <th onClick={() => handleSort("def")}>
                DEF{getSortIcon("def")}
              </th>
            )}

            {visibleColumns.spd && (
              <th onClick={() => handleSort("spd")}>
                SPD{getSortIcon("spd")}
              </th>
            )}

            {visibleColumns.cr && (
              <th onClick={() => handleSort("cr")}>
                CR{getSortIcon("cr")}
              </th>
            )}

            {visibleColumns.cd && (
              <th onClick={() => handleSort("cd")}>
                CD{getSortIcon("cd")}
              </th>
            )}

            {visibleColumns.acc && (
              <th onClick={() => handleSort("acc")}>
                ACC{getSortIcon("acc")}
              </th>
            )}

            {visibleColumns.res && (
              <th onClick={() => handleSort("res")}>
                RES{getSortIcon("res")}
              </th>
            )}

            {visibleColumns.ehp && (
              <th onClick={() => handleSort("ehp")}>
                EHP{getSortIcon("ehp")}
              </th>
            )}

            {visibleColumns.efficiency && (
              <th onClick={() => handleSort("efficiency")}>
                EFF{getSortIcon("efficiency")}
              </th>
            )}


            {visibleColumns.slots && (
              <th>2/4/6</th>
            )}
          </tr>
        </thead>

        <tbody>
          {pagedResults.map((result, index) => (
            <tr key={index}>
              <td>
                {(currentPage - 1) * PAGE_SIZE +
                  index +
                  1}
              </td>

              {visibleColumns.sets && (
                <td>{result.sets.join(", ")}</td>
              )}

              {visibleColumns.hp && (
                <td>{result.hp}</td>
              )}

              {visibleColumns.atk && (
                <td>{result.atk}</td>
              )}

              {visibleColumns.def && (
                <td>{result.def}</td>
              )}

              {visibleColumns.spd && (
                <td className="spd-cell">
                  {result.spd}
                </td>
              )}

              {visibleColumns.cr && (
                <td>{result.cr}</td>
              )}

              {visibleColumns.cd && (
                <td>{result.cd}</td>
              )}

              {visibleColumns.acc && (
                <td>{result.acc}</td>
              )}

              {visibleColumns.res && (
                <td>{result.res}</td>
              )}

              {visibleColumns.ehp && (
                <td>{Math.round(result.ehp)}</td>
              )}
                {visibleColumns.efficiency && (
                  <td>{Math.round(result.efficiency)}</td>
                )}

              {visibleColumns.slots && (
                <td>
                  {result.slot2}, {result.slot4}, {result.slot6}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() =>
            setCurrentPage((p) => p - 1)
          }
        >
          ◀
        </button>

        <span>
          Page {currentPage} / {totalPages}
        </span>

        <button
          disabled={
            currentPage === totalPages
          }
          onClick={() =>
            setCurrentPage((p) => p + 1)
          }
        >
          ▶
        </button>
      </div>
    </div>
  );
}
