import type { MonsterConfig as MonsterConfigType } from "../../types/MonsterConfig";
import StatsFilters from "./StatsFilters";
import SetsFilters from "./SetsFilters";
import AdvancedFilters from "./AdvancedFilters";

interface Props {
  config: MonsterConfigType;
  updateConfig: (config: Partial<MonsterConfigType>) => void;
}

export default function MonsterConfig({ config, updateConfig }: Props) {
  return (
    <>
      <StatsFilters config={config} updateConfig={updateConfig} />

      <SetsFilters config={config} updateConfig={updateConfig} />

      <AdvancedFilters config={config} updateConfig={updateConfig} />
    </>
  );
}
