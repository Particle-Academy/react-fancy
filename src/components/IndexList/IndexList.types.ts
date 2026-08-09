import type { HTMLAttributes, ReactNode } from "react";

export interface IndexListItem {
  /** Row marker — `"01"`, `"1."`. Rendered tabular so the column aligns. */
  num?: ReactNode;
  /** The row's subject, and the link text when `href` is set. */
  title: ReactNode;
  /** Secondary text after the title. */
  meta?: ReactNode;
  /** Trailing value, pushed to the far end — a year, a count. */
  value?: ReactNode;
  /** Makes the whole row clickable. See the note on nested anchors. */
  href?: string;
  /** Stable key. Defaults to the index. */
  id?: string;
}

export interface IndexListProps extends Omit<HTMLAttributes<HTMLOListElement>, "children"> {
  items: IndexListItem[];
  /**
   * Render an `<a>` for `href`. Pass your router's link (Inertia `Link`,
   * `next/link`) to keep client-side navigation. It receives `href`,
   * `className` and `children`.
   */
  linkAs?: React.ElementType;
}
