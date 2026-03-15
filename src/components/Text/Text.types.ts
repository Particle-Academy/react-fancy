import type { HTMLAttributes } from "react";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Which element to render */
  as?: "p" | "span" | "div" | "label";
  /** Text size */
  size?: "xs" | "sm" | "md" | "lg";
  /** Font weight */
  weight?: "normal" | "medium" | "semibold" | "bold";
  /** Text color preset */
  color?: "default" | "muted" | "accent" | "danger" | "success";
}
