import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface SkipLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  /**
   * The id of the element to skip to, without `#`. Default `"main"`, so
   * `<main id="main">` works with no props at all.
   */
  targetId?: string;
  /**
   * The fragment to link to, `"#content"`. Wins over `targetId` when both are
   * given. A non-fragment href is rendered as given and left to the browser.
   */
  href?: string;
  /** The link text. Default `"Skip to content"`. */
  label?: ReactNode;
}
