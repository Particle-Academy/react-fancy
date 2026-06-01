import type { HTMLAttributes, ReactNode } from "react";

export interface FauxClientProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Chrome style: a browser window, a device bezel, or no chrome. */
  variant?: "browser" | "device" | "bare";
  /** Address-bar / title text (browser variant). */
  url?: ReactNode;
  /** Right-aligned meta text in the bar (browser variant). */
  meta?: ReactNode;
  /** Show the macOS traffic-light dots (browser variant). */
  dots?: boolean;
  /**
   * Logical content width in px. When set, children render at this width and are
   * scaled to fit (see {@link FauxClientProps.scale}) — for downscaled previews
   * of full pages/apps. Omit to render children at natural size (chrome only).
   */
  width?: number;
  /** `"fit"` scales the logical {@link FauxClientProps.width} to the frame; a number is a fixed scale. */
  scale?: number | "fit";
  className?: string;
  /** Class for the browser bar. */
  barClassName?: string;
  /** Class for the content viewport. */
  bodyClassName?: string;
  children?: ReactNode;
}
