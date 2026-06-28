import type { CSSProperties } from "react";

export interface AudioViewerProps {
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
