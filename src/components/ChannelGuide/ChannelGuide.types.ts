import type { HTMLAttributes } from "react";
import type { Channel, ChannelPlayerValue } from "../../utils/media-channel";
import type { LiveBadgeLabels } from "../LiveBadge/LiveBadge.types";

export interface ChannelGuideLabels {
  /** The list's accessible name. */
  guide: string;
  /** A single-track channel. */
  single: string;
  /** A playlist. Slot: `{count}`. */
  playlist: string;
  /** A playlist of one. Slot: `{count}`. */
  playlistOne: string;
  /** A live channel (read before its badge). */
  live: string;
}

export interface ChannelGuideProps extends Omit<HTMLAttributes<HTMLUListElement>, "onChange"> {
  channels: Channel[];
  /** The shared channel value. Selecting a channel sets `channelId` (and its first track). */
  value: ChannelPlayerValue;
  onChange: (next: ChannelPlayerValue) => void;
  /** `"list"` (default) or `"grid"` of cards. */
  layout?: "list" | "grid";
  labels?: Partial<ChannelGuideLabels>;
  liveLabels?: Partial<LiveBadgeLabels>;
}
