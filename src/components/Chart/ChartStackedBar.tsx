import { useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { DEFAULT_COLORS, createLinearScale, niceScale } from "./chart.utils";
import { ChartAxis } from "./ChartAxis";
import { ChartGrid } from "./ChartGrid";
import { ChartTooltip } from "./ChartTooltip";
import type { ChartStackedBarProps } from "./Chart.types";

const PADDING = { top: 16, right: 16, bottom: 40, left: 48 };

export function ChartStackedBar({
  labels,
  series,
  height = 240,
  xAxis = true,
  yAxis = true,
  grid = true,
  tooltip = true,
  responsive = false,
  className,
}: ChartStackedBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const width = 500;

  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const stackTotals = useMemo(
    () => labels.map((_, li) => series.reduce((sum, s) => sum + (s.data[li] ?? 0), 0)),
    [labels, series],
  );

  const maxTotal = Math.max(...stackTotals, 1);
  const { min: yMin, max: yMax, ticks: yTicks } = useMemo(
    () => niceScale(0, maxTotal, 5),
    [maxTotal],
  );

  const yScale = useMemo(
    () => createLinearScale([yMin, yMax], [PADDING.top + plotHeight, PADDING.top]),
    [yMin, yMax, plotHeight],
  );

  const barWidth = Math.max(8, (plotWidth / labels.length) * 0.6);
  const barGap = (plotWidth - barWidth * labels.length) / (labels.length + 1);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tooltip || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const svgProps = responsive
    ? { viewBox: `0 0 ${width} ${height}`, width: "100%", preserveAspectRatio: "xMidYMid meet" as const }
    : { width, height };

  return (
    <div ref={containerRef} data-react-fancy-chart-stacked-bar="" className={cn("relative", className)} onMouseMove={handleMouseMove}>
      <svg {...svgProps} height={responsive ? undefined : height}>
        {grid && (
          <ChartGrid
            x={PADDING.left}
            y={PADDING.top}
            width={plotWidth}
            height={plotHeight}
            horizontal={{ ticks: yTicks, scale: yScale }}
          />
        )}

        {labels.map((label, li) => {
          const x = PADDING.left + barGap * (li + 1) + barWidth * li;
          let cumulative = 0;

          return (
            <g
              key={label}
              onMouseEnter={() => setHoverIdx(li)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {series.map((s, si) => {
                const val = s.data[li] ?? 0;
                const y0 = yScale(cumulative);
                const y1 = yScale(cumulative + val);
                cumulative += val;
                const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];

                return (
                  <rect
                    key={s.label}
                    x={x}
                    y={y1}
                    width={barWidth}
                    height={Math.max(0, y0 - y1)}
                    fill={color}
                    rx={si === series.length - 1 ? 3 : 0}
                    className="transition-opacity"
                    opacity={hoverIdx !== null && hoverIdx !== li ? 0.5 : 1}
                  />
                );
              })}
            </g>
          );
        })}

        {yAxis && (
          <ChartAxis orientation="y" ticks={yTicks} scale={yScale} x={PADDING.left} y={PADDING.top} length={plotHeight} />
        )}
        {xAxis && (
          <ChartAxis
            orientation="x"
            ticks={labels.map((_, i) => i)}
            scale={(i) => PADDING.left + barGap * (i + 1) + barWidth * i + barWidth / 2}
            x={PADDING.left}
            y={PADDING.top + plotHeight}
            length={plotWidth}
            formatTick={(v) => labels[Math.round(v)] ?? ""}
          />
        )}
      </svg>

      {tooltip && hoverIdx !== null && (
        <ChartTooltip
          visible
          x={tooltipPos.x}
          y={tooltipPos.y}
          content={
            <div>
              <div className="mb-1 font-medium">{labels[hoverIdx]}</div>
              {series.map((s, si) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length] }}
                  />
                  <span className="text-zinc-500">{s.label}:</span>
                  <span className="font-medium">{s.data[hoverIdx] ?? 0}</span>
                </div>
              ))}
              <div className="mt-1 border-t border-zinc-200 pt-1 text-zinc-500 dark:border-zinc-700">
                Total: <span className="font-medium text-zinc-900 dark:text-white">{stackTotals[hoverIdx]}</span>
              </div>
            </div>
          }
        />
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        {series.map((s, si) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length] }}
            />
            <span className="text-zinc-600 dark:text-zinc-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

ChartStackedBar.displayName = "ChartStackedBar";
