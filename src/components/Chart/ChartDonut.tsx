import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { DEFAULT_COLORS } from "./chart.utils";
import type { ChartDonutProps } from "./Chart.types";

export function ChartDonut({
  data,
  size = 160,
  strokeWidth = 24,
  showLegend = true,
  className,
}: ChartDonutProps) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    let offset = 0;
    return data.map((item, i) => {
      const pct = total > 0 ? item.value / total : 0;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const rotation = (offset / total) * 360;
      offset += item.value;

      return {
        ...item,
        dash,
        gap,
        rotation,
        color: item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      };
    });
  }, [data, total, circumference]);

  return (
    <div data-react-fancy-chart-donut="" className={cn("inline-flex items-center gap-6", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => (
          <circle
            key={seg.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeLinecap="round"
            transform={`rotate(${seg.rotation - 90} ${size / 2} ${size / 2})`}
          />
        ))}
      </svg>
      {showLegend && (
        <div className="flex flex-col gap-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 text-sm">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-zinc-600 dark:text-zinc-400">
                {seg.label}
              </span>
              <span className="font-medium">{seg.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

ChartDonut.displayName = "ChartDonut";
