import type { HTMLAttributes } from "react";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Which heading element to render */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Text size */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** Font weight */
  weight?: "normal" | "medium" | "semibold" | "bold";
}
