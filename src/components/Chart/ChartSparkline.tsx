import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { createLinearScale, monotonePath } from "./chart.utils";
import type { ChartSparklineProps } from "./Chart.types";

export function ChartSparkline({
  data,
  width = 120,
  height = 32,
  color = "#3b82f6",
  min: floor,
  className,
}: ChartSparklineProps) {
  const d = useMemo(() => {
    if (data.length < 2) return "";
    // `min` lowers the bottom of the scale. A value below it still extends the
    // scale, as `Chart.Line` does with zero, so no point lands outside the box.
    const dataMin = Math.min(...data);
    const min = floor === undefined ? dataMin : Math.min(floor, dataMin);
    const max = Math.max(...data);
    const xScale = createLinearScale([0, data.length - 1], [1, width - 1]);
    const yScale = createLinearScale([min, max], [height - 2, 2]);
    const points: [number, number][] = data.map((v, i) => [xScale(i), yScale(v)]);
    return monotonePath(points);
  }, [data, width, height, floor]);

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
