import type { HTMLAttributes, ReactNode } from "react";
import type { Placement } from "../../utils/types";

/** Every word ImagePill shows, for translation. */
export interface ImagePillLabels {
  /** Shown in the preview while `loadThumbnail` is pending. @default "Loading preview…" */
  loading?: string;
  /** Shown in the preview when `loadThumbnail` rejects. @default "Preview unavailable" */
  error?: string;
}

/**
 * Where the thumbnail stands, on the pill as `data-thumbnail`:
 * `none` (no source), `idle` (a `loadThumbnail` not called yet), `loading`,
 * `ready`, `error` (the loader rejected or the image failed to load).
 */
export type ImagePillThumbnailState = "none" | "idle" | "loading" | "ready" | "error";

export interface ImagePillProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The pill's text, the thumbnail's `alt` and the accessible name. */
  label: string;
  /** A thumbnail URL. Wins over `file` and `loadThumbnail`. */
  src?: string;
  /** A File or Blob to preview. Its object URL exists only while the preview is open. */
  file?: Blob | null;
  /**
   * Fetch the thumbnail URL lazily: called ONCE, on the first hover or focus,
   * never on render or on the server. Pending shows a loading state; a
   * rejection shows the error state and is not retried.
   */
  loadThumbnail?: () => Promise<string>;
  /** Whether the preview is open, controlled. */
  open?: boolean;
  /** The starting open state, uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Called when hover, focus, blur or Escape asks to open or close the preview. */
  onOpenChange?: (open: boolean) => void;
  /** Where the preview opens. Flips when there is no room. @default "top" */
  placement?: Placement;
  /** Replaces the preview's content (the thumbnail). */
  preview?: ReactNode;
  /** Merged onto the preview panel's classes. */
  previewClassName?: string;
  /** Attributes for the preview content's wrapper, e.g. a `data-*` handle of your own. */
  previewProps?: HTMLAttributes<HTMLSpanElement> & { [data: `data-${string}`]: string | undefined };
  /** Words, for translation. */
  labels?: ImagePillLabels;
}
