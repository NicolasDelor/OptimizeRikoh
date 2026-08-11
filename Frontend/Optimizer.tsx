import { useState } from "react";
import { api } from "../services/api";

export default function Optimizer() {
  const [result, setResult] = useState<any>();

  const optimize = async () => {
    const response = await api.post("/optimize");
    setResult(response.data);
  };

  return (
    <div>
      <h1>Summoners War Optimizer</h1>
      <button onClick={optimize}>Optimize</button>

      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
