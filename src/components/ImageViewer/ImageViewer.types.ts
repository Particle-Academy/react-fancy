import type { CSSProperties } from "react";

/** Pan offset (in container pixels) + zoom factor for an `<ImageViewer>`. */
export interface ImageViewerViewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface ImageViewerProps {
  /** Image source — an `http(s):`, `data:`, or `blob:` URL. */
  src: string;
  /** Alt text for the image (also used as the download filename hint). */
  alt?: string;
  /**
   * How the image sits in its container at zoom 1. `"contain"` (default) fits
   * the whole image, `"cover"` fills and crops, `"none"` shows it at natural
   * size (pan to see the rest).
   */
  fit?: "contain" | "cover" | "none";
  /** Allow Ctrl/⌘+wheel zoom and the zoom controls (default `true`). */
  zoomable?: boolean;
  /** Allow click-drag panning (default `true`). */
  pannable?: boolean;
  /** Show the floating zoom controls. Defaults to the value of `zoomable`. */
  controls?: boolean;
  /** Minimum zoom factor (default `0.25`). */
  minZoom?: number;
  /** Maximum zoom factor (default `8`). */
  maxZoom?: number;
  /**
   * Paint a checkerboard behind the image so transparency reads clearly
   * (default `true`). Set `false` for a flat themed surface.
   */
  checkerboard?: boolean;
  /**
   * Controlled viewport (pan + zoom). Pair with `onViewportChange`. Omit for
   * uncontrolled internal state. Exposed so an agent can pan/zoom to point at
   * something via a bridge.
   */
  viewport?: ImageViewerViewport;
  /** Initial viewport when uncontrolled. */
  defaultViewport?: ImageViewerViewport;
  /** Called whenever the viewport (pan/zoom) changes. */
  onViewportChange?: (viewport: ImageViewerViewport) => void;
  /** Fired when the image finishes loading. */
  onLoad?: () => void;
  /** Fired when the image fails to load. */
  onError?: () => void;
  /** Additional CSS classes for the viewport container. */
  className?: string;
  /** Inline styles for the viewport container (e.g. a fixed height). */
  style?: CSSProperties;
}
