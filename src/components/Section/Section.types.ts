import type { ElementType, HTMLAttributes, ReactNode } from "react";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** Vertical rhythm between sections. Default `md`. */
  space?: "sm" | "md" | "lg";
  /** Draw the hairline rule that opens the section. */
  divider?: boolean;
  /** The element to render. Defaults to `section`. */
  as?: ElementType;
}
