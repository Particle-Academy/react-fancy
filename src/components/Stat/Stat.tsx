import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { StatBand } from "./StatBand";
import type { StatProps } from "./Stat.types";

const valueClasses: Record<NonNullable<StatProps["size"]>, string> = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
};

/**
 * A big display figure with a caption — the `2016 / 120+ / 08 / 14` band cell.
 *
 * Twenty-seven gallery styles build this, and **five of seventeen forgot
 * `tabular-nums`**. That is not a cosmetic slip: in a proportional face a `1` is
 * narrower than a `0`, so a row of figures that is supposed to read as a band
 * comes out visibly ragged, and the fix is one property nobody remembers to
 * look for. It is the default here.
 *
 * Distinct from a right-aligned key/value list — this is a large flush-left
 * figure repeated across a row.
 */
const StatRoot = forwardRef<HTMLDivElement, StatProps>(
  ({ value, label, size = "md", className, children, ...props }, ref) => {
    return (
      <div ref={ref} data-react-fancy-stat="" className={cn(className)} {...props}>
        {children ?? (
          <>
            <div
              data-react-fancy-stat-value=""
              className={cn(
                "font-semibold leading-none tracking-tight text-[color:var(--fancy-text,var(--color-zinc-900))] tabular-nums dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]",
                valueClasses[size],
              )}
            >
              {value}
            </div>
            {label != null && (
              <div
                data-react-fancy-stat-label=""
                className="mt-1.5 font-mono text-xs uppercase tracking-wide text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]"
              >
                {label}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

StatRoot.displayName = "Stat";

export const Stat = Object.assign(StatRoot, { Band: StatBand });
