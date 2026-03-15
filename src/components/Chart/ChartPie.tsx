import { useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { DEFAULT_COLORS } from "./chart.utils";
import { ChartTooltip } from "./ChartTooltip";
import type { ChartPieProps } from "./Chart.types";

export function ChartPie({
  data,
  size = 200,
  showLabels = false,
  tooltip = true,
  className,
}: ChartPieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const center = size / 2;
  const radius = size / 2 - 4;

  const slices = useMemo(() => {
    let startAngle = -Math.PI / 2;
    return data.map((item, i) => {
      const pct = total > 0 ? item.value / total : 0;
      const angle = pct * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const largeArc = angle > Math.PI ? 1 : 0;

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const midAngle = startAngle + angle / 2;
      const labelX = center + (radius * 0.65) * Math.cos(midAngle);
      const labelY = center + (radius * 0.65) * Math.sin(midAngle);

      const d = pct >= 1
        ? `M${center},${center - radius} A${radius},${radius} 0 1 1 ${center},${center + radius} A${radius},${radius} 0 1 1 ${center},${center - radius}`
        : `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;

      const color = item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      startAngle = endAngle;

      return { ...item, d, color, labelX, labelY, pct };
    });
  }, [data, total, center, radius]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={containerRef} className={cn("relative inline-flex items-center gap-6", className)} onMouseMove={handleMouseMove}>
      <svg width={size} height={size}>
        {slices.map((slice, i) => (
          <g key={slice.label}>
            <path
              d={slice.d}
              fill={slice.color}
              stroke="white"
              strokeWidth={2}
              className="transition-opacity"
              opacity={hoverIdx !== null && hoverIdx !== i ? 0.5 : 1}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
            {showLabels && slice.pct > 0.05 && (
              <text
                x={slice.labelX}
                y={slice.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white text-[10px] font-medium"
              >
                {Math.round(slice.pct * 100)}%
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="text-zinc-600 dark:text-zinc-400">{slice.label}</span>
            <span className="font-medium">{slice.value}</span>
          </div>
        ))}
      </div>

      {tooltip && hoverIdx !== null && (
        <ChartTooltip
          visible
          x={tooltipPos.x}
          y={tooltipPos.y}
          content={
            <div>
              <span className="font-medium">{slices[hoverIdx].label}</span>:{" "}
              {slices[hoverIdx].value} ({Math.round(slices[hoverIdx].pct * 100)}%)
            </div>
          }
        />
      )}
    </div>
  );
}

ChartPie.displayName = "ChartPie";
