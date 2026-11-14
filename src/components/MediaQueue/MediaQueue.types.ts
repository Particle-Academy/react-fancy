import type { HTMLAttributes } from "react";
import type { Channel, ChannelPlayerValue } from "../../utils/media-channel";
import type { TrackItemLabels } from "../TrackItem/TrackItem.types";

export interface MediaQueueLabels {
  heading: string;
  empty: string;
}

export interface MediaQueueProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  channel: Channel | undefined;
  /** The shared channel value: the queue follows its shuffle order and repeat mode. */
  value: ChannelPlayerValue;
  /** Jump to a queued track. Without it the queue is read-only. */
  onChange?: (next: ChannelPlayerValue) => void;
  /** Show at most this many. Default 5. */
  limit?: number;
  labels?: Partial<MediaQueueLabels>;
  trackLabels?: Partial<TrackItemLabels>;
}
