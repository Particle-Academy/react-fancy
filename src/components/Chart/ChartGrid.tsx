interface ChartGridProps {
  x: number;
  y: number;
  width: number;
  height: number;
  horizontal?: { ticks: number[]; scale: (v: number) => number };
  vertical?: { ticks: number[]; scale: (v: number) => number };
}

export function ChartGrid({ x, y, width, height, horizontal, vertical }: ChartGridProps) {
  return (
    <g>
      {horizontal?.ticks.map((tick) => {
        const ty = horizontal.scale(tick);
        return (
          <line
            key={`h-${tick}`}
            x1={x}
            y1={ty}
            x2={x + width}
            y2={ty}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-zinc-100 dark:text-zinc-800"
          />
        );
      })}
      {vertical?.ticks.map((tick) => {
        const tx = vertical.scale(tick);
        return (
          <line
            key={`v-${tick}`}
            x1={tx}
            y1={y}
            x2={tx}
            y2={y + height}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-zinc-100 dark:text-zinc-800"
          />
        );
      })}
    </g>
  );
}

ChartGrid.displayName = "ChartGrid";
