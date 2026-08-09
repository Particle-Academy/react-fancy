import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { StatBandProps } from "./Stat.types";

/**
 * The row a set of `<Stat>`s sits in.
 *
 * A plain grid, but it is the reason `<Stat>` defaults to `tabular-nums`: a
 * figure alone can be proportional without anyone noticing, and only becomes
 * wrong once it has neighbours to fail to line up with.
 */
export const StatBand = forwardRef<HTMLDivElement, StatBandProps>(
  ({ columns = 4, className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-react-fancy-stat-band=""
        className={cn("grid gap-6", className)}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

StatBand.displayName = "StatBand";
