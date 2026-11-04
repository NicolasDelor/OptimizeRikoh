import type { TeamOptimizationResult } from "../../services/teamBuildOptimizer";
import RuneVisual from "./RuneVisual";

interface Props {
  results: TeamOptimizationResult[];
}

function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Math.ceil(value).toLocaleString("fr-FR");
}

export default function TeamResultsPanel({ results }: Props) {
  const teamResults = results.filter((result) => result.selections.length > 1);

  if (teamResults.length === 0) {
    return null;
  }

  return (
    <div className="card results-card">
      <div className="results-header">
        <div>
          <h2>Équipes optimisées</h2>

          <div className="results-focus">
            Aucune rune n’est partagée entre les monstres.
          </div>
        </div>

        <span className="build-count">
          {teamResults.length.toLocaleString()} équipes conservées
        </span>
      </div>

      <div className="monster-results-grid">
        {teamResults.map((teamResult, teamIndex) => (
          <section
            key={`${teamIndex}-${teamResult.score}`}
            className="monster-results-section"
          >
            <div className="results-header">
              <h3>Équipe #{teamIndex + 1}</h3>

              <span className="build-count">
                Score {formatDecimal(teamResult.score)}
              </span>
            </div>

            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Ordre</th>
                    <th>Monstre</th>
                    <th>SPD</th>
                    <th>HP</th>
                    <th>ATK</th>
                    <th>DEF</th>
                    <th>CR</th>
                    <th>DCC</th>
                    <th>ACC</th>
                    <th>RES</th>
                    <th>SETS</th>
                    <th>RUNES</th>
                  </tr>
                </thead>

                <tbody>
                  {teamResult.selections.map((selection, selectionIndex) => (
                    <tr key={selection.monsterId}>
                      <td>{selectionIndex + 1}</td>
                      <td>{selection.monsterName}</td>

                      <td className="spd-cell">
                        {formatDecimal(selection.build.spd)}
                      </td>

                      <td>{formatDecimal(selection.build.hp)}</td>

                      <td>{formatDecimal(selection.build.atk)}</td>

                      <td>{formatDecimal(selection.build.def)}</td>

                      <td>{formatDecimal(selection.build.cr)}</td>
                      <td>{formatDecimal(selection.build.cd)}</td>
                      <td>{formatDecimal(selection.build.acc)}</td>
                      <td>{formatDecimal(selection.build.res)}</td>
                      <td>{selection.build.sets.join(", ")}</td>
                      <td>
                        <div className="result-runes">
                          {selection.build.runes.map((rune) => (
                            <RuneVisual key={rune.id} rune={rune} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
