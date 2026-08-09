import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { BrandMarkProps } from "./Brand.types";

const sizeClasses: Record<Exclude<NonNullable<BrandMarkProps["size"]>, number>, string> = {
  sm: "h-6 w-6 rounded-md text-[11px]",
  md: "h-8 w-8 rounded-lg text-sm",
  lg: "h-11 w-11 rounded-xl text-lg",
};

/**
 * The square logo tile — a glyph centred in a rounded, coloured square.
 *
 * `Brand` has always taken its mark as a caller-supplied `logo` node, which is
 * exactly why every page that wanted one rebuilt the same square: fixed size,
 * rounded, grid-centred, bold, white, and `shrink-0` so a flex row never
 * squashes it. Four surfaces carried that block inline.
 *
 * ## It ships no brand colour, deliberately
 *
 * The default is a neutral zinc tile. A component library inventing your brand
 * gradient would be wrong, and would be the first thing every consumer had to
 * override — so the FILL is `className`'s job and only the geometry lives here.
 * That is also what the duplicated code actually had in common: each copy
 * already pulled its gradient from a token class and hand-rolled the box.
 */
export const BrandMark = forwardRef<HTMLSpanElement, BrandMarkProps>(
  ({ glyph, size = "md", className, style, ...props }, ref) => {
    const numeric = typeof size === "number";

    return (
      <span
        ref={ref}
        data-react-fancy-brand-mark=""
        aria-hidden={props["aria-label"] ? undefined : true}
        className={cn(
          "grid shrink-0 place-items-center font-bold leading-none text-white select-none",
          numeric ? "rounded-lg" : sizeClasses[size],
          // Overridable default: a mark with no `className` still reads as a
          // mark rather than as an invisible box.
          "bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900",
          className,
        )}
        style={numeric ? { height: size, width: size, fontSize: Math.round(size * 0.5), ...style } : style}
        {...props}
      >
        {glyph}
      </span>
    );
  },
);

BrandMark.displayName = "BrandMark";
