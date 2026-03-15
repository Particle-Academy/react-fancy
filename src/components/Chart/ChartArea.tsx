import { ChartLine } from "./ChartLine";
import type { ChartAreaProps } from "./Chart.types";

export function ChartArea(props: ChartAreaProps) {
  return <ChartLine {...props} fill fillOpacity={0.15} />;
}

ChartArea.displayName = "ChartArea";
