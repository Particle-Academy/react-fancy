import type { FauxClientProps } from "../FauxClient/FauxClient.types";
import type { CSSProperties } from "react";

/**
 * Pages the APP rendered to images, behind its own auth. With this the viewer
 * never fetches or references the PDF: these URLs are its only requests.
 */
export interface PdfPageSource {
  /** Number of pages. */
  count: number;
  /**
   * The image URL for a page (1-based). `scale` is a resolution hint, the zoom
   * times the device pixel ratio rounded UP to one of 1, 1.5, 2, 3 or 4, so a
   * page is fetched at a handful of sizes rather than one per zoom click.
   * Render scale 1 at whatever width reads sharply at fit-width in your layout.
   * This is also the place to burn a watermark in on the server.
   */
  url: (page: number, scale: number) => string;
  /**
   * Page width / height, used to size a page before its image arrives (each
   * page switches to its image's real ratio once loaded). Default A4 portrait,
   * `1 / Math.SQRT2`.
   */
  aspectRatio?: number;
}

/**
 * What a viewer of the page images may do. Every flag defaults to allowed.
 * These are DETERRENTS: a web page cannot stop a determined viewer, and a page
 * image that reached the screen can always be captured. Real control is the
 * app never serving the PDF, which page-image mode makes possible.
 */
export interface PdfViewerPolicy {
  /** `false`: no context menu ("Save image as") and no dragging the images out. */
  download?: boolean;
  /** `false`: print CSS blanks the viewer, and Ctrl/Cmd+P is swallowed while focus is inside it. */
  print?: boolean;
  /** `false`: user selection is off. (Page images have no text layer anyway.) */
  copy?: boolean;
  /**
   * `"deter"`: the pages blur while the tab is hidden or the window has lost
   * focus, and briefly after a PrintScreen key. It CANNOT prevent a screenshot.
   * Default `"allow"`.
   */
  screenshot?: "allow" | "deter";
}

/** A tiled text overlay drawn over every page, in the browser. */
export interface PdfViewerWatermark {
  text: string;
  /** 0-1. Default 0.15. */
  opacity?: number;
  /** Degrees. Default -30. */
  angle?: number;
  /** Repeats per area; 2 tiles twice as tightly. Default 1. */
  density?: number;
}

export interface PdfViewerProps {
  /**
   * Show the PDF in react-fancy's `FauxClient` frame with a full-screen button,
   * revealed on hover. Zoom stays on the browser's own PDF toolbar (with
   * `pages`, on the viewer's toolbar). Default `false`.
   */
  frame?: boolean;
  /** Passed to the frame (`variant`, `onFullscreenChange`, …). */
  frameProps?: Partial<FauxClientProps>;
  /**
   * PDF source — an `http(s):`, `data:`, or `blob:` URL — shown in the
   * browser's native PDF plugin. Ignored, and never referenced, when `pages` is set.
   */
  src?: string;
  /**
   * Page-image mode: show server-rendered page images instead of embedding the
   * PDF. `policy` and `watermark` apply only in this mode.
   */
  pages?: PdfPageSource;
  /** The current page (1-based), controlled. */
  page?: number;
  /** Starting page when uncontrolled. Default 1. */
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** Zoom, 1 = fit width, controlled (page-image mode). */
  zoom?: number;
  /** Default 1. */
  defaultZoom?: number;
  onZoomChange?: (zoom: number) => void;
  /** What the viewer may do with the pages (page-image mode). Default: everything allowed. */
  policy?: PdfViewerPolicy;
  /** A tiled overlay over every page (page-image mode). Removable with devtools; burn it in server-side when it must hold. */
  watermark?: PdfViewerWatermark;
  /** Accessible title for the document (default `"PDF document"`). */
  title?: string;
  /** Additional CSS classes for the container. */
  className?: string;
  /** Inline styles for the container (e.g. a fixed height). */
  style?: CSSProperties;
}
