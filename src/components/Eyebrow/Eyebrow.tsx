import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { EyebrowProps } from "./Eyebrow.types";

/**
 * The mono running head that opens a section — `01 — SELECTED WORK`, optionally
 * over a hairline rule, with a second item pushed to the far end.
 *
 * Thirty-six surfaces in the Inspiration Gallery carry some version of this. It
 * is a small component for a reason: what they share is the STRUCTURE (a
 * numbered marker, a label, an optional trailing aside, an optional rule) while
 * every one of them restyles the type. So this owns the arrangement and the
 * uppercase mono default, and gets out of the way of `className`.
 *
 * `num` is emphasised rather than styled a fixed colour, because in half the
 * designs it is the only part of the line that is not muted — and expressing
 * that with a `<b>` keeps it meaningful when the styling is replaced wholesale.
 */
export const Eyebrow = forwardRef<HTMLDivElement, EyebrowProps>(
  ({ num, label, aside, rule = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-react-fancy-eyebrow=""
        className={cn(
          "flex items-baseline gap-3 font-mono text-[11.5px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
          rule && "border-b border-zinc-200 pb-2 dark:border-zinc-800",
          className,
        )}
        {...props}
      >
        {children ?? (
          <span>
            {num != null && (
              <>
                <b className="font-medium text-zinc-900 dark:text-zinc-100">{num}</b>
                {label != null && " — "}
              </>
            )}
            {label}
          </span>
        )}

        {/* `ml-auto` rather than `justify-between`, so a single-item eyebrow
            still sits flush left instead of being centred by the gap. */}
        {aside != null && <span className="ml-auto">{aside}</span>}
      </div>
    );
  },
);

Eyebrow.displayName = "Eyebrow";
