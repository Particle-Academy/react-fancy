import type { FauxClientProps } from "../FauxClient/FauxClient.types";
import type { CSSProperties } from "react";

export interface PdfViewerProps {
  /**
   * Show the PDF in react-fancy's `FauxClient` frame with a full-screen button,
   * revealed on hover. Zoom stays on the browser's own PDF toolbar. Default `false`.
   */
  frame?: boolean;
  /** Passed to the frame (`variant`, `onFullscreenChange`, …). */
  frameProps?: Partial<FauxClientProps>;
  /** PDF source — an `http(s):`, `data:`, or `blob:` URL. */
  src: string;
  /** Accessible title for the embedded document (default `"PDF document"`). */
  title?: string;
  /** Additional CSS classes for the container. */
  className?: string;
  /** Inline styles for the container (e.g. a fixed height). */
  style?: CSSProperties;
}
