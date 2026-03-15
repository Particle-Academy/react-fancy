import { useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { DEFAULT_COLORS, createLinearScale, linearPath, monotonePath, niceScale } from "./chart.utils";
import { ChartAxis } from "./ChartAxis";
import { ChartGrid } from "./ChartGrid";
import { ChartTooltip } from "./ChartTooltip";
import type { ChartLineProps } from "./Chart.types";

const PADDING = { top: 16, right: 16, bottom: 40, left: 48 };

export function ChartLine({
  labels,
  series,
  height = 240,
  curve = "monotone",
  showDots = true,
  fill = false,
  fillOpacity = 0.1,
  xAxis = true,
  yAxis = true,
  grid = true,
  tooltip = true,
  animate = true,
  responsive = false,
  className,
}: ChartLineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; labelIdx: number } | null>(null);
  const width = 500;

  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const allValues = series.flatMap((s) => s.data);
  const dataMin = Math.min(0, ...allValues);
  const dataMax = Math.max(...allValues);

  const { min: yMin, max: yMax, ticks: yTicks } = useMemo(
    () => niceScale(dataMin, dataMax, 5),
    [dataMin, dataMax],
  );

  const xScale = useMemo(
    () => createLinearScale([0, labels.length - 1], [PADDING.left, PADDING.left + plotWidth]),
    [labels.length, plotWidth],
  );
  const yScale = useMemo(
    () => createLinearScale([yMin, yMax], [PADDING.top + plotHeight, PADDING.top]),
    [yMin, yMax, plotHeight],
  );

  const pathFn = curve === "monotone" ? monotonePath : linearPath;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tooltip || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const closestIdx = Math.round(((svgX - PADDING.left) / plotWidth) * (labels.length - 1));
    const idx = Math.max(0, Math.min(labels.length - 1, closestIdx));
    setHoverInfo({
      x: ((xScale(idx) / width) * rect.width),
      y: e.clientY - rect.top,
      labelIdx: idx,
    });
  };

  const svgProps = responsive
    ? { viewBox: `0 0 ${width} ${height}`, width: "100%", preserveAspectRatio: "xMidYMid meet" as const }
    : { width, height };

  return (
    <div
      ref={containerRef}
      data-react-fancy-chart-line=""
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverInfo(null)}
    >
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

        {series.map((s, si) => {
          const color = s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
          const points: [number, number][] = s.data.map((v, i) => [xScale(i), yScale(v)]);
          const d = pathFn(points);

          return (
            <g key={s.label}>
              {fill && (
                <path
                  d={`${d} L${points[points.length - 1][0]},${yScale(yMin)} L${points[0][0]},${yScale(yMin)} Z`}
                  fill={color}
                  fillOpacity={fillOpacity}
                />
              )}
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={2}
                className={animate ? "transition-all duration-500" : ""}
              />
              {showDots && points.map(([px, py], i) => (
                <circle
                  key={i}
                  cx={px}
                  cy={py}
                  r={3}
                  fill="white"
                  stroke={color}
                  strokeWidth={2}
                />
              ))}
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
            scale={xScale}
            x={PADDING.left}
            y={PADDING.top + plotHeight}
            length={plotWidth}
            formatTick={(v) => labels[Math.round(v)] ?? ""}
          />
        )}

        {/* Hover line */}
        {hoverInfo !== null && (
          <line
            x1={xScale(hoverInfo.labelIdx)}
            y1={PADDING.top}
            x2={xScale(hoverInfo.labelIdx)}
            y2={PADDING.top + plotHeight}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-zinc-300 dark:text-zinc-600"
          />
        )}
      </svg>

      {tooltip && hoverInfo !== null && (
        <ChartTooltip
          visible
          x={hoverInfo.x}
          y={hoverInfo.y}
          content={
            <div>
              <div className="mb-1 font-medium">{labels[hoverInfo.labelIdx]}</div>
              {series.map((s, si) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length] }}
                  />
                  <span className="text-zinc-500">{s.label}:</span>
                  <span className="font-medium">{s.data[hoverInfo.labelIdx]}</span>
                </div>
              ))}
            </div>
          }
        />
      )}

      {/* Legend */}
      {series.length > 1 && (
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
      )}
    </div>
  );
}

ChartLine.displayName = "ChartLine";
