import type { HTMLAttributes, ReactNode } from "react";

export type MarqueeDirection = "left" | "right";

export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  /** Item nodes — each child is one strip item (alternative to `items`) */
  children?: ReactNode;
  /** Data-driven items (alternative to children) — strings or nodes */
  items?: ReactNode[];
  /**
   * Scroll speed in px/s — keeps perceived speed constant regardless of
   * content width. Ignored when `duration` is set. Default: 40
   */
  speed?: number;
  /** Explicit seconds per loop (overrides `speed`) */
  duration?: number;
  /** Scroll direction. Default: "left" */
  direction?: MarqueeDirection;
  /** Pause the animation while hovered. Default: false */
  pauseOnHover?: boolean;
  /** Controlled pause — `true` freezes the strip. Default: false */
  paused?: boolean;
  /** Gap between items (number = px). Default: 40 */
  gap?: number | string;
  /**
   * Masked fade at the strip edges: `true` (48px, default), `false` to
   * disable, or a number/CSS length for a custom fade width
   */
  fade?: boolean | number | string;
  /** Optional node rendered between items */
  separator?: ReactNode;
  /**
   * Tilt the whole strip in degrees (e.g. `-1` for the torn, off-axis band
   * look). The strip widens slightly to stay edge-to-edge. Default: 0
   */
  angle?: number;
  /**
   * Decorative strips are `aria-hidden` (default). Set `false` to expose the
   * content to assistive tech — the duplicated loop copy stays hidden either
   * way. Default: true
   */
  decorative?: boolean;
  className?: string;
}
