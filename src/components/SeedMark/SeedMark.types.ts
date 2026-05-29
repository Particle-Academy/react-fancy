import type { HTMLAttributes } from "react";

export interface SeedMarkProps extends HTMLAttributes<HTMLSpanElement> {
  /** Icon diameter in px (height is 1.25× size) */
  size?: number;
}
