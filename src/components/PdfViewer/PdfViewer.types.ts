import type { CSSProperties } from "react";

export interface PdfViewerProps {
  /** PDF source — an `http(s):`, `data:`, or `blob:` URL. */
  src: string;
  /** Accessible title for the embedded document (default `"PDF document"`). */
  title?: string;
  /** Additional CSS classes for the container. */
  className?: string;
  /** Inline styles for the container (e.g. a fixed height). */
  style?: CSSProperties;
}
