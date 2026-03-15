import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { DEFAULT_COLORS } from "./chart.utils";
import type { ChartBarProps } from "./Chart.types";

export function ChartBar({
  data,
  height = 200,
  showValues = false,
  className,
}: ChartBarProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  return (
    <div className={cn("w-full", className)} data-react-fancy-chart-bar="">
      {showValues && (
        <div className="mb-1 flex gap-2">
          {data.map((item) => (
            <div
              key={item.label}
              className="flex-1 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              {item.value}
            </div>
          ))}
        </div>
      )}
      <div
        className="flex items-end gap-2"
        style={{ height }}
      >
        {data.map((item, i) => {
          const barHeight = (item.value / maxValue) * 100;
          const color = item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

          return (
            <div
              key={item.label}
              className="flex h-full flex-1 items-end justify-center"
              data-react-fancy-chart-bar-column=""
            >
              <div
                data-react-fancy-chart-bar-item=""
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: color,
                  minHeight: 4,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((item) => (
          <div
            key={item.label}
            className="flex-1 text-center text-xs text-zinc-500 dark:text-zinc-400"
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

ChartBar.displayName = "ChartBar";
