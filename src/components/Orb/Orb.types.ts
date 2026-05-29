import type { HTMLAttributes } from "react";

export interface OrbProps extends HTMLAttributes<HTMLSpanElement> {
  /** Diameter in px */
  size?: number;
  /** Enable the slow-pulse animation */
  pulse?: boolean;
  /**
   * Color key. Maps to Tailwind-compatible palette stops.
   * Defaults to "violet" (ADF primary).
   */
  color?: "violet" | "amber" | "green" | "rose" | "blue" | "zinc";
}
