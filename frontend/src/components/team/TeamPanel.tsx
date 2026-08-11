import { useState } from "react";
import MonsterList from "./MonsterList";
import type { Monster } from "../../types/Monster";

interface Props {
  monsters: Monster[];
  selectedMonsterId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onAdd: (name: string) => void;
}

export default function TeamPanel(props: Props) {
  const [monsterName, setMonsterName] = useState("");

  return (
    <div className="card">
      <h2>Team</h2>

      <MonsterList
        monsters={props.monsters}
        selectedMonsterId={props.selectedMonsterId}
        onSelect={props.onSelect}
        onDelete={props.onDelete}
      />

      <div className="add-monster">
        <input
          value={monsterName}
          onChange={(e) => setMonsterName(e.target.value)}
          placeholder="Nom du monstre"
        />

        <button
          onClick={() => {
            if (!monsterName.trim()) return;
            props.onAdd(monsterName.trim());
            setMonsterName("");
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}