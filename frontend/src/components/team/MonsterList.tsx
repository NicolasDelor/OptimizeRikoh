import type { Monster } from "../../types/Monster";

interface Props {
  monsters?: Monster[];
  selectedMonsterId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function MonsterList({
  monsters = [],
  selectedMonsterId,
  onSelect,
  onDelete,
}: Props) {
  return (
    <>
      {monsters.map((monster) => (
        <div
          key={monster.id}
          className={`monster-item ${
            selectedMonsterId === amonster.id ? "selected" : ""
          }`}
          onClick={() => onSelect(monster.id)}
        >
          <span>{monster.name}</span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(monster.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </>
  );
}
