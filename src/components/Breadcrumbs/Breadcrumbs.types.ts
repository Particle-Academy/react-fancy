import type { ReactNode } from "react";

export interface BreadcrumbsProps {
  children: ReactNode;
  separator?: ReactNode;
  shrink?: boolean;
  className?: string;
}

export interface BreadcrumbsItemProps {
  children: ReactNode;
  href?: string;
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
