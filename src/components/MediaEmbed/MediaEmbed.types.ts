import type { HTMLAttributes } from "react";
import type { EmbedSource } from "../../utils/media-channel";

export interface MediaEmbedLabels {
  /** The poster's button name. Slots: `{title}`, `{provider}`. */
  play: string;
  /** Unknown provider, or an id the provider does not accept. */
  unsupported: string;
}

export interface MediaEmbedProps extends Omit<HTMLAttributes<HTMLDivElement>, "onError"> {
  source: EmbedSource;
  /**
   * The provider's player is not loaded (no request to the provider at all)
   * until this is first true; after that, play / pause go through the
   * provider's API where it has one (YouTube, Vimeo).
   */
  playing: boolean;
  /** The poster asks to play. */
  onPlayingChange?: (playing: boolean) => void;
  /** The iframe title and the poster's name. Default: the provider's name. */
  title?: string;
  /** Shown on the poster before the player loads. Should be self-hosted. */
  poster?: string;
  onError?: () => void;
  labels?: Partial<MediaEmbedLabels>;
}
