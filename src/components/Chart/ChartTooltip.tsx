import { cn } from "../../utils/cn";

interface ChartTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
  className?: string;
}

export function ChartTooltip({ visible, x, y, content, className }: ChartTooltipProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-50 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
        className,
      )}
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%) translateY(-8px)",
      }}
    >
      {content}
    </div>
  );
}

ChartTooltip.displayName = "ChartTooltip";
