import type { HTMLAttributes } from "react";
import type { Channel, MediaTrack } from "../../utils/media-channel";
import type { LiveBadgeLabels } from "../LiveBadge/LiveBadge.types";

export interface NowPlayingLabels {
  /** Shown without a channel. */
  nothing: string;
}

export interface NowPlayingProps extends HTMLAttributes<HTMLDivElement> {
  channel?: Channel;
  /** The current track (a track or playlist channel). */
  track?: MediaTrack;
  /** `"sm"` drops the artwork to 40px. Default `"md"`. */
  size?: "sm" | "md";
  labels?: Partial<NowPlayingLabels>;
  liveLabels?: Partial<LiveBadgeLabels>;
}
