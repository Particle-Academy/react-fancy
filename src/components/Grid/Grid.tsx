import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { GridProps } from "./Grid.types";

/**
 * Gutter lengths. The grid applies these ITSELF rather than through a Tailwind
 * `gap-*` class, because the column cap has to divide by the gap that is
 * actually in effect — and a class is a value the component does not control.
 *
 * 5.23.0 kept the class and hard-coded the matching length beside it. In the
 * showcase those two disagreed by 2px, which was enough: with the real gutter
 * wider than the arithmetic assumed, N tracks plus N-1 gaps overflowed the row
 * and `auto-fit` dropped to N-1. A 3-up grid rendered 2-up, and nothing was
 * wrong with either value on its own.
 */
const GAP = { sm: "0.75rem", md: "1.5rem", lg: "2.5rem" } as const;

/** Narrowest a column may get before the grid drops one. */
const MIN_TRACK = "16rem";

/**
 * The modular grid.
 *
 * Column count goes through a custom property rather than a `grid-cols-N` class
 * because N is a prop: Tailwind cannot generate a class it never sees in source,
 * and every hand-rolled copy in the gallery worked around that differently. The
 * property also gives a design a single place to override the breakpoint
 * behaviour in CSS without fighting a utility.
 *
 * ## `cols` is a CEILING, not a fixed count
 *
 * The responsive template reads `--fancy-grid-cols`, so `cols` means "this many
 * at most, fewer when narrow". Until 5.23.0 it meant nothing at all while
 * `responsive` was on: the template was a fixed `repeat(auto-fit, minmax(min(
 * 100%, 16rem), 1fr))`, so a grid asked for 2 and a grid asked for 5 rendered
 * the same track list, and the only way to get a real column count was
 * `responsive={false}` — which then had no breakpoints at all. The property this
 * doc comment has always advertised was set and never read.
 *
 * The gutter is in the arithmetic because it has to be: N tracks each `100%/N`
 * wide plus N-1 gaps overflow the row, and `auto-fit` responds by fitting N-1.
 * An off-by-one that looks like a design decision.
 *
 * Which is why the grid sets its own `gap` from `--fancy-grid-gap` instead of a
 * Tailwind `gap-*` class: the cap must divide by the gutter actually in effect,
 * and a class is a value this component does not control. Override the property
 * to change the gutter — that moves the spacing and the arithmetic together.
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ children, cols = 3, gap = "md", responsive = true, className, style, ...props }, ref) => {
    // The largest a track may be: an even share of the row once the gutters are
    // paid for. `max()` against MIN_TRACK keeps the collapse; `min()` against
    // 100% stops a single column overflowing a narrow viewport.
    const cap =
      "calc((100% - (var(--fancy-grid-cols) - 1) * var(--fancy-grid-gap)) / var(--fancy-grid-cols))";

    return (
      <div
        ref={ref}
        {...props}
        data-react-fancy-grid=""
        data-responsive={responsive ? "true" : "false"}
        className={cn("grid", className)}
        style={{
          ...style,
          ["--fancy-grid-cols" as string]: String(cols),
          ["--fancy-grid-gap" as string]: GAP[gap],
          // Read back rather than inlined, so overriding the property in CSS
          // moves the gutter AND the arithmetic together.
          gap: "var(--fancy-grid-gap)",
          gridTemplateColumns: responsive
            ? `repeat(auto-fit, minmax(min(100%, max(${MIN_TRACK}, ${cap})), 1fr))`
            : "repeat(var(--fancy-grid-cols), minmax(0, 1fr))",
        }}
      >
        {children}
      </div>
    );
  },
);

Grid.displayName = "Grid";
