import type { OptimizationResult }
  from "../../types/OptimizationResult";

interface Props {
  results: OptimizationResult[];
}

export default function ResultsPanel({
  results,
}: Props) {
  return (
    <div className="card">
      <h2>Results</h2>

      {results.length === 0 ? (
        <div className="results-placeholder">
          Aucun résultat pour le moment.
        </div>
      ) : (
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Sets</th>
                <th>HP</th>
                <th>ATK</th>
                <th>DEF</th>
                <th>SPD</th>
                <th>CR</th>
                <th>CD</th>
                <th>ACC</th>
                <th>RES</th>
                <th>EHP</th>
                <th>2/4/6</th>
              </tr>
            </thead>

            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>

                  <td>{result.sets.join(", ")}</td>

                  <td>{result.hp}</td>
                  <td>{result.atk}</td>
                  <td>{result.def}</td>

                  <td className="spd-cell">
                    {result.spd}
                  </td>

                  <td>{result.cr}</td>
                  <td>{result.cd}</td>
                  <td>{result.acc}</td>
                  <td>{result.res}</td>

                  <td>{Math.round(result.ehp)}</td>

                  <td>
                    {result.slot2}, {result.slot4}, {result.slot6}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}