import { forwardRef, type MouseEvent } from "react";
import type { SkipLinkProps } from "./SkipLink.types";

/** Elements that take focus without a tabindex. Giving one `-1` would take it OUT of the tab order. */
const NATIVELY_FOCUSABLE =
  "a[href], area[href], button, input, select, textarea, summary, iframe, [contenteditable=''], [contenteditable='true']";

/**
 * A "Skip to content" link (WCAG 2.4.1, Bypass Blocks). Render it first in the
 * page, before the header, so it is the first tab stop.
 *
 * Visually hidden until it is focused, then shown at the top-start corner in
 * the theme's surface and text colours. Both looks ship in `styles.css`, keyed
 * on the handle rather than on Tailwind classes, so the link is hidden even in
 * an app that has not @sourced the kit: an un-compiled `sr-only` would leave a
 * stray link visible at the top of every page.
 *
 * Activating it moves FOCUS to the target, not just the scroll position: a
 * plain `#main` link scrolls, but focus stays on the link in some browsers, so
 * the next Tab lands back in the header. A target that cannot take focus
 * (a `<main>`, a `<div>`) gets `tabIndex=-1` first, if it has no tabindex of
 * its own. The click is handled here, so a hash router never sees the
 * fragment; with no element of that id, the browser's own navigation runs.
 */
export const SkipLink = forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ targetId = "main", href, label = "Skip to content", onClick, ...props }, ref) => {
    const to = href ?? `#${targetId}`;

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || !to.startsWith("#")) return;
      const target = document.getElementById(decodeURIComponent(to.slice(1)));
      if (!target) return;
      e.preventDefault();
      if (!target.hasAttribute("tabindex") && !target.matches(NATIVELY_FOCUSABLE)) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus();
      target.scrollIntoView?.({ block: "start" });
    };

    return (
      <a
        {...props}
        ref={ref}
        href={to}
        onClick={handleClick}
        data-skip-link=""
        data-react-fancy-skip-link=""
      >
        {label}
      </a>
    );
  },
);

SkipLink.displayName = "SkipLink";
