import type { HTMLAttributes, ReactNode } from "react";

/** One figure and what it counts. */
export interface StatListItem {
  /** The figure. Emphasised — it is what the eye lands on first. */
  value: ReactNode;
  /** What the figure counts. */
  label: ReactNode;
  /**
   * Stable handle for this row, for an agent reading a figure off the page.
   *
   * Defaults to `label` when it is a plain string, which covers the common
   * case without asking a caller to repeat themselves.
   */
  key?: string;
}

export interface StatListProps extends HTMLAttributes<HTMLDivElement> {
  /** The figures. Data rather than children — the repeated thing is a shape. */
  items: StatListItem[];
  /** Which edge the stack aligns to. Default `"right"`. */
  align?: "left" | "right";
}
