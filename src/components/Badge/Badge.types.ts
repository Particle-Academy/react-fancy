import type { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge color */
  color?: "zinc" | "red" | "blue" | "green" | "amber" | "violet" | "rose";
  /** Visual variant */
  variant?: "solid" | "outline" | "soft";
  /** Badge size */
  size?: "sm" | "md" | "lg";
  /** Show a small dot indicator before text */
  dot?: boolean;
}
