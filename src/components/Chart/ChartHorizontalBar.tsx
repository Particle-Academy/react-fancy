import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { DEFAULT_COLORS } from "./chart.utils";
import type { ChartHorizontalBarProps } from "./Chart.types";

export function ChartHorizontalBar({
  data,
  height,
  showValues = true,
  className,
}: ChartHorizontalBarProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  const barHeight = 28;
  const gap = 8;
  const computedHeight = height ?? data.length * (barHeight + gap) - gap;

  return (
    <div className={cn("w-full", className)} data-react-fancy-chart-horizontal-bar="">
      <div className="flex flex-col gap-2" style={{ height: computedHeight }}>
        {data.map((item, i) => {
          const widthPct = (item.value / maxValue) * 100;
          const color = item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-right text-xs text-zinc-500 dark:text-zinc-400">
                {item.label}
              </span>
              <div className="relative flex-1">
                <div
                  className="h-7 rounded-r-md transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    minWidth: 4,
                  }}
                />
                {showValues && (
                  <span className="absolute top-1/2 left-full ml-2 -translate-y-1/2 text-xs font-medium text-zinc-500">
                    {item.value}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

ChartHorizontalBar.displayName = "ChartHorizontalBar";
