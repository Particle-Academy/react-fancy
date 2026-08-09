import type { HTMLAttributes, ReactNode } from "react";

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Column count at the widest breakpoint. Default `3`. */
  cols?: number;
  /** Gutter. Default `md`. */
  gap?: "sm" | "md" | "lg";
  /**
   * Collapse toward one column on small screens. Default `true`.
   *
   * Off for grids that are genuinely fixed — a 2-up of icons, say — where
   * collapsing looks broken rather than responsive.
   */
  responsive?: boolean;
}
