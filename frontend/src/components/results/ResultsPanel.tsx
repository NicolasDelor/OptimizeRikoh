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
        <div>
          {results.map((result, index) => (
            <div key={index}>
              <div>Build #{index + 1}</div>

              <div>HP : {result.hp}</div>
              <div>ATK : {result.atk}</div>
              <div>DEF : {result.def}</div>
              <div>SPD : {result.spd}</div>
              <div>CR : {result.cr}</div>
              <div>CD : {result.cd}</div>
              <div>ACC : {result.acc}</div>
              <div>RES : {result.res}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}