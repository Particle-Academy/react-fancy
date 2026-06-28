import type { CSSProperties, ReactNode } from "react";
import type { MediaKind } from "../../utils/media-type";
import type { ImageViewerProps } from "../ImageViewer/ImageViewer.types";
import type { VideoViewerProps } from "../VideoViewer/VideoViewer.types";
import type { AudioViewerProps } from "../AudioViewer/AudioViewer.types";
import type { PdfViewerProps } from "../PdfViewer/PdfViewer.types";

export interface MediaViewerProps {
  /** Media source — an `http(s):`, `data:`, or `blob:` URL. */
  src: string;
  /**
   * MIME type — preferred for picking the viewer. When omitted, the kind is
   * sniffed from `src` (extension or `data:` URI). Always pass `mime` with a
   * bare `blob:` URL, which carries no type of its own.
   */
  mime?: string;
  /** Alt text / label, forwarded as image alt and audio/PDF title. */
  alt?: string;
  /** Force a specific viewer, bypassing detection. */
  kind?: MediaKind;
  /** Extra props for the underlying `<ImageViewer>`. */
  imageProps?: Partial<Omit<ImageViewerProps, "src" | "alt">>;
  /** Extra props for the underlying `<VideoViewer>`. */
  videoProps?: Partial<Omit<VideoViewerProps, "src">>;
  /** Extra props for the underlying `<AudioViewer>`. */
  audioProps?: Partial<Omit<AudioViewerProps, "src">>;
  /** Extra props for the underlying `<PdfViewer>`. */
  pdfProps?: Partial<Omit<PdfViewerProps, "src">>;
  /** Rendered for unknown / unpreviewable types (default: a download card). */
  fallback?: ReactNode;
  /** Fired when the chosen viewer reports a load error. */
  onError?: () => void;
  /** Additional CSS classes, forwarded to the chosen viewer. */
  className?: string;
  /** Inline styles, forwarded to the chosen viewer. */
  style?: CSSProperties;
}
