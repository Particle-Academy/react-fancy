import type { HTMLAttributes, ReactNode } from "react";

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /**
   * The most columns this grid may use. Default `3`.
   *
   * A CEILING, not a fixed count: with `responsive` on (the default) the grid
   * uses fewer as it narrows and never more than this. Published as
   * `--fancy-grid-cols`, which the track template reads — so overriding that
   * property in CSS genuinely changes the layout.
   */
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
