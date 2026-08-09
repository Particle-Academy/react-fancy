import type { HTMLAttributes, ReactNode } from "react";

export interface PullQuoteProps extends Omit<HTMLAttributes<HTMLQuoteElement>, "cite"> {
  /** Who said it. Rendered in a `<cite>`. */
  attribution?: ReactNode;
  /** Where it is from — publication, page, role. Follows the attribution. */
  source?: ReactNode;
  /** URL the quote came from. Becomes the `<blockquote cite>` attribute. */
  citeUrl?: string;
  /** Rule-bracketed treatment: hairlines above and below. Default `false`. */
  rule?: boolean;
  children?: ReactNode;
}
