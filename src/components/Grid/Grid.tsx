import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { GridProps } from "./Grid.types";

const GAP = { sm: "gap-3", md: "gap-6", lg: "gap-10" } as const;

/**
 * The modular grid.
 *
 * Column count goes through a custom property rather than a `grid-cols-N` class
 * because N is a prop: Tailwind cannot generate a class it never sees in source,
 * and every hand-rolled copy in the gallery worked around that differently. The
 * property also gives a design a single place to override the breakpoint
 * behaviour in CSS without fighting a utility.
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ children, cols = 3, gap = "md", responsive = true, className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        {...props}
        data-react-fancy-grid=""
        data-responsive={responsive ? "true" : "false"}
        className={cn("grid", GAP[gap], className)}
        style={{
          ...style,
          ["--fancy-grid-cols" as string]: String(cols),
          gridTemplateColumns: responsive
            ? "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))"
            : `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
    );
  },
);

Grid.displayName = "Grid";
