import type { HTMLAttributes } from "react";
import type { Color } from "../../utils/types";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge color — any color in the Tailwind v4 palette. */
  color?: Color;
  /** Visual variant */
  variant?: "solid" | "outline" | "soft";
  /** Badge size */
  size?: "sm" | "md" | "lg";
  /** Show a small dot indicator before text */
  dot?: boolean;
}
