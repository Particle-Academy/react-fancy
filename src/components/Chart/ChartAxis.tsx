interface ChartAxisProps {
  orientation: "x" | "y";
  ticks: number[];
  scale: (value: number) => number;
  x: number;
  y: number;
  length: number;
  label?: string;
  formatTick?: (value: number) => string;
}

function defaultFormat(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function ChartAxis({
  orientation,
  ticks,
  scale,
  x,
  y,
  length,
  label,
  formatTick = defaultFormat,
}: ChartAxisProps) {
  if (orientation === "x") {
    return (
      <g>
        <line x1={x} y1={y} x2={x + length} y2={y} stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" />
        {ticks.map((tick) => {
          const tx = scale(tick);
          return (
            <g key={tick}>
              <line x1={tx} y1={y} x2={tx} y2={y + 4} stroke="currentColor" className="text-zinc-300 dark:text-zinc-600" />
              <text x={tx} y={y + 16} textAnchor="middle" className="fill-zinc-500 text-[10px] dark:fill-zinc-400">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
        {label && (
          <text x={x + length / 2} y={y + 32} textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400">
            {label}
          </text>
        )}
      </g>
    );
  }

  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + length} stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" />
      {ticks.map((tick) => {
        const ty = scale(tick);
        return (
          <g key={tick}>
            <line x1={x - 4} y1={ty} x2={x} y2={ty} stroke="currentColor" className="text-zinc-300 dark:text-zinc-600" />
            <text x={x - 8} y={ty + 3} textAnchor="end" className="fill-zinc-500 text-[10px] dark:fill-zinc-400">
              {formatTick(tick)}
            </text>
          </g>
        );
      })}
      {label && (
        <text
          x={x - 36}
          y={y + length / 2}
          textAnchor="middle"
          transform={`rotate(-90, ${x - 36}, ${y + length / 2})`}
          className="fill-zinc-500 text-[11px] dark:fill-zinc-400"
        >
          {label}
        </text>
      )}
    </g>
  );
}

ChartAxis.displayName = "ChartAxis";
