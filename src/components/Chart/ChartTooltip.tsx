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
        "pointer-events-none absolute z-50 rounded-lg border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] px-3 py-2 text-xs shadow-lg dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
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
