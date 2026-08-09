import { forwardRef, Fragment } from "react";
import { cn } from "../../utils/cn";
import type { KbdProps } from "./Kbd.types";

const sizeClasses: Record<NonNullable<KbdProps["size"]>, string> = {
  xs: "min-w-[1.25rem] px-1 py-px text-[9px]",
  sm: "min-w-[1.4rem] px-1 py-0.5 text-[10px]",
  md: "min-w-[1.6rem] px-1.5 py-0.5 text-xs",
};

const capClasses =
  "inline-grid place-items-center rounded border border-zinc-300 bg-zinc-50 " +
  "font-mono leading-none text-zinc-700 " +
  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

/**
 * A keyboard key cap — `<Kbd>K</Kbd>`, or a chord via `<Kbd keys={["Cmd","K"]} />`.
 *
 * Twenty `<kbd>` elements across this suite's own showcase carried six
 * different className recipes for the same thing: rounded, bordered, mono,
 * small, with a dark-mode counterpart. None of them disagreed on intent; they
 * disagreed on which greys.
 *
 * `min-w` is the detail worth having in one place: without it a `K` cap is
 * visibly narrower than an `Esc` cap beside it, and a row of single letters
 * reads as ragged rather than as keys.
 */
export const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ keys, separator = "+", size = "sm", className, children, ...props }, ref) => {
    if (keys?.length) {
      return (
        // The chord is ONE <kbd> containing per-key caps: a screen reader
        // announces "Cmd + K" as a unit, which is what it is, rather than as
        // two unrelated keys.
        <kbd
          ref={ref}
          data-react-fancy-kbd=""
          className={cn("inline-flex items-center gap-1 font-mono not-italic", className)}
          {...props}
        >
          {keys.map((k, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span aria-hidden className="text-zinc-400 dark:text-zinc-500">
                  {separator}
                </span>
              )}
              <span className={cn(capClasses, sizeClasses[size])}>{k}</span>
            </Fragment>
          ))}
        </kbd>
      );
    }

    return (
      <kbd
        ref={ref}
        data-react-fancy-kbd=""
        className={cn(capClasses, sizeClasses[size], "not-italic", className)}
        {...props}
      >
        {children}
      </kbd>
    );
  },
);

Kbd.displayName = "Kbd";
