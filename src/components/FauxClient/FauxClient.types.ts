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
  /**
   * A zoom bar (−, percentage, +) and a full-screen button, in the frame's
   * bottom-right corner. `true` for both; `{ zoom: false }` or
   * `{ fullscreen: false }` to leave one out. Default `false`.
   */
  controls?: boolean | { zoom?: boolean; fullscreen?: boolean };
  /** The zoom, 1 = fit. Controllable, so an agent can read and set it. */
  zoom?: number;
  defaultZoom?: number;
  onZoomChange?: (zoom: number) => void;
  /** Default 0.5. */
  minZoom?: number;
  /** Default 4. */
  maxZoom?: number;
  /**
   * Called when the frame enters or leaves full screen, however it happened
   * (the button, Esc, the browser). The frame also carries
   * `data-fullscreen="true"` while it is, for styling the content.
   */
  onFullscreenChange?: (fullscreen: boolean) => void;
  /**
   * Take the parent's height, and give the content whatever the chrome leaves.
   * For content that sizes itself to its box (a slide viewer, a spreadsheet)
   * rather than to what is in it. Default `false`.
   */
  fill?: boolean;
  className?: string;
  /** Class for the browser bar. */
  barClassName?: string;
  /** Class for the content viewport. */
  bodyClassName?: string;
  children?: ReactNode;
}
