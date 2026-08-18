import { useMemo, useState } from "react";
import type { Monster } from "../../types/Monster";

interface Props {
  monsters: Monster[];
  selectedMonsterId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onAdd: (name: string) => void;
  availableMonsters?: any[];
}

export default function TeamPanel({
  monsters,
  onDelete,
  onAdd,
  availableMonsters = [],
}: Props) {
  const [search, setSearch] = useState("");

  const filteredMonsters = useMemo(() => {
    if (!search.trim()) {
      return availableMonsters.slice(0, 50);
    }

    return availableMonsters
      .filter((monster) =>
        monster.name
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .slice(0, 50);
  }, [search, availableMonsters]);

  return (
    <div className="card">
      <h2>Team</h2>

      <input
        className="monster-search-input"
        type="text"
        placeholder="Rechercher un monstre..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
      />

      <div className="monster-list-container">
        {filteredMonsters.map(
          (monster, index) => {
            const selectedMonster =
              monsters.find(
                (m) =>
                  m.unitId ===
                  monster.unitId
              );

            return (
              <div
                key={`${monster.unitId}-${index}`}
                className={`monster-list-item ${
                  selectedMonster
                    ? "selected"
                    : "unselected"
                }`}
                title={monster.name}
                onClick={() => {
                  if (selectedMonster) {
                    onDelete(
                      selectedMonster.id
                    );
                  } else {
                    onAdd(
                      JSON.stringify(
                        monster
                      )
                    );
                  }
                }}
              >
                <div className="monster-grid-item">
                                {monster.imageUrl && (
                                  <img
                                    src={monster.imageUrl}
                                    alt={monster.name}
                                    className="monster-grid-image"
                                  />
                                )}
                            </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}