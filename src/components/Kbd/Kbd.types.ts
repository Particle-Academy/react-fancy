import type { HTMLAttributes, ReactNode } from "react";

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /**
   * Render a chord as separate keys — `keys={["Cmd", "K"]}` renders two caps
   * with a separator between them, rather than one wide cap reading "Cmd K".
   */
  keys?: ReactNode[];
  /** Separator drawn between chord keys. Default `"+"`. */
  separator?: ReactNode;
  size?: "xs" | "sm" | "md";
  children?: ReactNode;
}
