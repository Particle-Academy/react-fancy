import type { Color } from "../../utils/types";

export interface ProgressProps {
  value?: number;
  max?: number;
  variant?: "bar" | "circular";
  /**
   * Named scale, or an explicit pixel diameter for `variant="circular"`.
   *
   * The scale topped out at 64px and was written inline, so a larger ring was
   * impossible rather than merely awkward.
   */
  size?: "sm" | "md" | "lg" | number;
  /** Ring thickness in px (circular only). Derived from the diameter if unset. */
  strokeWidth?: number;
  color?: Color;
  indeterminate?: boolean;
  showValue?: boolean;
  className?: string;
}
