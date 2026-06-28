import type { CSSProperties } from "react";

export interface VideoViewerProps {
  /** Video source — an `http(s):`, `data:`, or `blob:` URL. */
  src: string;
  /** Poster image shown before playback. */
  poster?: string;
  /** Show native playback controls (default `true`). */
  controls?: boolean;
  /** Autoplay on mount (most browsers require `muted` too). */
  autoPlay?: boolean;
  /** Loop playback (default `false`). */
  loop?: boolean;
  /** Start muted (default `false`). */
  muted?: boolean;
  /** How the video fits its box: `"contain"` (default) or `"cover"`. */
  fit?: "contain" | "cover";
  /** Fired when the video fails to load. */
  onError?: () => void;
  /** Additional CSS classes for the container. */
  className?: string;
  /** Inline styles for the container (e.g. a fixed height). */
  style?: CSSProperties;
}
