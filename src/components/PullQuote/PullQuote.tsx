import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { PullQuoteProps } from "./PullQuote.types";

/**
 * A pull quote — the oversized line lifted out of body copy, with optional
 * attribution and a rule-bracketed treatment.
 *
 * Twelve gallery styles build one. The reason this is a component rather than a
 * class is the same reason `<Kbd>` renders a real `<kbd>`: of the eight quote
 * elements in those styles, **one** was a `<blockquote>` — five were `<p>` and
 * two were `<div>` — and **none** used `<cite>` for the attribution. They all
 * look right and none of them says what it is.
 *
 * `citeUrl` maps to `<blockquote cite>`, which is the attribute's actual job
 * (the source URL) and is routinely confused with the visible `<cite>` element
 * (the work's title). Keeping them as separate props stops the two collapsing
 * into one another.
 */
export const PullQuote = forwardRef<HTMLQuoteElement, PullQuoteProps>(
  ({ attribution, source, citeUrl, rule = false, className, children, ...props }, ref) => {
    return (
      <blockquote
        ref={ref}
        cite={citeUrl}
        data-react-fancy-pull-quote=""
        className={cn(
          "m-0 text-2xl font-medium leading-snug tracking-tight text-zinc-900 dark:text-zinc-100",
          rule && "border-y border-zinc-200 py-6 dark:border-zinc-800",
          className,
        )}
        {...props}
      >
        <p data-react-fancy-pull-quote-text="" className="m-0">
          {children}
        </p>

        {(attribution != null || source != null) && (
          <footer
            data-react-fancy-pull-quote-attribution=""
            className="mt-3 text-sm font-normal tracking-normal text-zinc-500 dark:text-zinc-400"
          >
            {attribution != null && <cite className="not-italic">{attribution}</cite>}
            {attribution != null && source != null && <span aria-hidden> · </span>}
            {source}
          </footer>
        )}
      </blockquote>
    );
  },
);

PullQuote.displayName = "PullQuote";
