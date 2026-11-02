import type { HTMLAttributes, ReactNode } from "react";
import type { NavigableProps } from "../../utils/types";

export interface BreadcrumbsProps {
  children: ReactNode;
  separator?: ReactNode;
  shrink?: boolean;
  className?: string;
}

/**
 * A crumb accepts the HTML attributes common to every element it can render as
 * (`<a>`, the `as` component, `<button>` or `<span>`), so `title`, `id`,
 * `aria-*`, `style` and handlers are typed as well as forwarded. Typed against
 * `HTMLElement` rather than one element because the crumb's element depends on
 * its props; anchor-only attributes such as `target` are not offered, since the
 * same crumb renders as a `<span>` once it is `active`.
 *
 * `onClick` is omitted from the element's attributes and redeclared below with
 * its existing `() => void` signature.
 */
export interface BreadcrumbsItemProps
  extends NavigableProps,
    Omit<HTMLAttributes<HTMLElement>, "onClick" | "children"> {
  children: ReactNode;
  active?: boolean;
  /**
   * Navigate by callback instead of by URL, for a crumb with no href.
   *
   * Controlled components own their own navigation — a repository browser
   * walking directories, a wizard stepping back — and have no address to link
   * to. Renders the crumb as a `<button>`. Ignored when `active`, since the
   * current crumb is not a destination, and `href` wins if both are given.
   */
  onClick?: () => void;
  className?: string;
}
