import type { CSSProperties } from "react";

export interface AudioViewerProps {
  /**
   * How much to fetch before playback is requested.
   *
   * Defaults to `"metadata"` — duration and the scrubber, nothing more. With no
   * attribute the browser decides, and Chrome decides `"auto"` for audio, which
   * means simply RENDERING the component downloads the whole file. Measured on
   * the Fancy showcase: one audio tile on the package grid transferred 995 KB
   * before anyone pressed play.
   *
   * Pass `"none"` for a thumbnail that should cost nothing, or `"auto"` to
   * restore the eager behaviour deliberately.
   */
  preload?: "none" | "metadata" | "auto";
  /** Audio source — an `http(s):`, `data:`, or `blob:` URL. */
  src: string;
  /** Optional label shown above the player (e.g. the file name). */
  title?: string;
  /** Show native playback controls (default `true`). */
  controls?: boolean;
  /** Autoplay on mount. */
  autoPlay?: boolean;
  /** Loop playback (default `false`). */
  loop?: boolean;
  /** Fired when the audio fails to load. */
  onError?: () => void;
  /** Additional CSS classes for the card. */
  className?: string;
  /** Inline styles for the card. */
  style?: CSSProperties;
}
