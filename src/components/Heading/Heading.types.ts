import type { HTMLAttributes } from "react";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Which heading element to render */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /**
   * Text size, on a SEMANTIC ramp — the names are steps on this scale, not
   * Tailwind class names. `xl` is `text-2xl` and `2xl` is `text-4xl`, and that
   * offset has been true since the component shipped, so the display steps
   * below continue the same ramp rather than re-basing it and silently
   * resizing every existing heading.
   *
   * `3xl`–`7xl` are DISPLAY sizes: hero type, "typography at maximum volume".
   * They carry tighter tracking, because letter-spacing tuned for body-adjacent
   * headings reads loose and unset once type gets big.
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
  /** Font weight */
  weight?: "normal" | "medium" | "semibold" | "bold";
}
