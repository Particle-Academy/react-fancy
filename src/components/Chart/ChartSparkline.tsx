import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { createLinearScale, monotonePath } from "./chart.utils";
import type { ChartSparklineProps } from "./Chart.types";

export function ChartSparkline({
  data,
  width = 120,
  height = 32,
  color = "#3b82f6",
  className,
}: ChartSparklineProps) {
  const d = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const xScale = createLinearScale([0, data.length - 1], [1, width - 1]);
    const yScale = createLinearScale([min, max], [height - 2, 2]);
    const points: [number, number][] = data.map((v, i) => [xScale(i), yScale(v)]);
    return monotonePath(points);
  }, [data, width, height]);

  return (
    <svg
      width={width}
      height={height}
      className={cn("inline-block", className)}
      data-react-fancy-chart-sparkline=""
    >
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

ChartSparkline.displayName = "ChartSparkline";
