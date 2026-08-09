import type { HTMLAttributes, ReactNode } from "react";

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  /** The figure itself — `"2016"`, `"120+"`, `"08"`. */
  value?: ReactNode;
  /** The caption under it. */
  label?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export interface StatBandProps extends HTMLAttributes<HTMLDivElement> {
  /** Columns in the band. Default `4`. */
  columns?: number;
}
