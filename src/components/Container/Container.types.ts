import type { ElementType, HTMLAttributes, ReactNode } from "react";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** Reading measure. `md` (default) suits body text; `full` removes the cap. */
  size?: "sm" | "md" | "lg" | "full";
  /** The element to render. A container is often a `<main>` or `<header>`. */
  as?: ElementType;
}
