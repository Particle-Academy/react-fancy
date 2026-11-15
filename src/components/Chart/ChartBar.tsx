import { useMemo, useRef } from "react";
import { ChartXLabelList } from "./ChartAxis";
import { formatXTick, useElementWidth, visibleXTickIndexes, xLabelStep } from "./chart.ticks";
import { cn } from "../../utils/cn";
import { DEFAULT_COLORS } from "./chart.utils";
import type { ChartBarProps } from "./Chart.types";

export function ChartBar({
  data,
  height = 200,
  showValues = false,
  xLabelInterval = "auto",
  xTickFormat,
  className,
}: ChartBarProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  // The label row is HTML, as wide as its container, so "auto" thins against
  // the measured width. Until it is measured (and on the server) every label
  // is drawn, as before.
  const labelRowRef = useRef<HTMLDivElement>(null);
  const rowWidth = useElementWidth(labelRowRef);
  const tickTexts = useMemo(
    () => data.map((item, i) => formatXTick(item.label, i, xTickFormat)),
    [data, xTickFormat],
  );
  // gap-2 between columns: 8px.
  const slot = rowWidth === null || data.length === 0 ? null : (rowWidth + 8) / data.length;
  const shown = new Set(visibleXTickIndexes(data.length, xLabelStep(tickTexts, slot, xLabelInterval, 12)));

  return (
    <div className={cn("w-full", className)} data-react-fancy-chart-bar="">
      {showValues && (
        <div className="mb-1 flex gap-2">
          {data.map((item) => (
            <div
              key={item.label}
              className="flex-1 text-center text-xs font-medium text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]"
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
      <div ref={labelRowRef} className="mt-2 flex gap-2" aria-hidden="true">
        {data.map((item, i) => (
          <div
            key={item.label}
            data-react-fancy-chart-bar-label=""
            className="flex-1 text-center text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]"
          >
            {shown.has(i) ? tickTexts[i] : ""}
          </div>
        ))}
      </div>
      <ChartXLabelList labels={data.map((item) => item.label)} />
    </div>
  );
}

ChartBar.displayName = "ChartBar";
