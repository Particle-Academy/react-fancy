import type { HTMLAttributes } from "react";

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  /** Icon container size */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Icon name to resolve from the registered icon set (e.g., "rocket", "arrow-right") */
  name?: string;
  /** Which registered icon set to use (defaults to the configured default) */
  iconSet?: string;
}
