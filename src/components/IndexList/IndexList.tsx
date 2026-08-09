import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { IndexListProps } from "./IndexList.types";

/**
 * A flush-left numbered index — `num · title · meta · trailing value`, each row
 * optionally a single clickable target.
 *
 * Thirteen gallery styles build this, and the sandbox uses a `stretched-link`
 * treatment in twenty-four places.
 *
 * ## Exactly one anchor per row, by construction
 *
 * The row is `relative` and the title's `<a>` carries `after:absolute
 * after:inset-0`, so the anchor's own pseudo-element covers the row. The
 * alternative — wrapping the row in an `<a>` and putting more links inside —
 * produces nested anchors, which is issue #418: the browser silently
 * restructures that DOM, so the server HTML and the client tree disagree and
 * hydration blows up. A test asserts one anchor per row for that reason.
 *
 * The link text stays the title rather than becoming an `aria-label` on an
 * invisible overlay, so the accessible name is the thing you would say out loud.
 */
export const IndexList = forwardRef<HTMLOListElement, IndexListProps>(
  ({ items, linkAs, className, ...props }, ref) => {
    const Link = linkAs ?? "a";

    return (
      <ol ref={ref} data-react-fancy-index-list="" className={cn("m-0 list-none p-0", className)} {...props}>
        {items.map((item, i) => (
          <li
            key={item.id ?? i}
            data-react-fancy-index-row=""
            className="relative flex items-baseline gap-4 border-b border-zinc-200 py-3 last:border-b-0 dark:border-zinc-800"
          >
            {item.num != null && (
              <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                {item.num}
              </span>
            )}

            <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
              {item.href ? (
                <Link
                  href={item.href}
                  className="no-underline after:absolute after:inset-0 after:content-[''] hover:underline"
                >
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </span>

            {item.meta != null && (
              <span className="shrink-0 truncate text-sm text-zinc-500 dark:text-zinc-400">{item.meta}</span>
            )}

            {item.value != null && (
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {item.value}
              </span>
            )}
          </li>
        ))}
      </ol>
    );
  },
);

IndexList.displayName = "IndexList";
