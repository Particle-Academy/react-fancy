import type { HTMLAttributes } from "react";
import type { Color } from "../../utils/types";

/**
 * `Progress` renders three nested elements and used to be a CLOSED interface
 * over all of them: no rest spread, and `className` reaching only the outer
 * wrapper. So the bar could not be named (it announced as "progress bar, 42%",
 * with 42% OF WHAT unrecoverable) and the track and fill could not be styled.
 *
 * `color` is omitted from the DOM attributes because this component's `color` is
 * a palette name, not the legacy HTML `color` attribute.
 */
export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
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
  /**
   * The unfilled groove — the bar's track, or the ring's background circle.
   *
   * Named for the ROLE rather than the element so one vocabulary covers both
   * variants. The alternative a caller reaches for otherwise is an
   * arbitrary-variant selector like `[&>div>div]:…`, which hard-codes this
   * component's DOM shape into their app and breaks silently — still
   * rendering, just unstyled — the first time it gains a wrapper.
   */
  trackClassName?: string;
  /** The filled portion — the bar's fill, or the ring's value circle. */
  fillClassName?: string;
}
