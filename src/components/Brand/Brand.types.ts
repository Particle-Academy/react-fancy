import type { HTMLAttributes, ReactNode } from "react";

export interface BrandProps {
  logo?: ReactNode;
  name?: string;
  tagline?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export interface BrandMarkProps extends HTMLAttributes<HTMLSpanElement> {
  /** What sits in the square — a letter, an initial, an icon. */
  glyph?: ReactNode;
  /**
   * `"sm" | "md" | "lg"`, or an exact pixel size when a design calls for one
   * the scale does not have.
   */
  size?: "sm" | "md" | "lg" | number;
}
