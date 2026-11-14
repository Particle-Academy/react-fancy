import type { HTMLAttributes, Ref } from "react";
import type { Channel, ChannelPlayerValue } from "../../utils/media-channel";
import type { LiveBadgeLabels } from "../LiveBadge/LiveBadge.types";
import type { MediaEmbedLabels } from "../MediaEmbed/MediaEmbed.types";

/**
 * Why `onError` fired.
 * - `"refused"`: the src is not `http(s)` or same-origin relative.
 * - `"unsupported"`: nothing registered can play this source here (HLS or
 *   DASH in a browser without native support and no host adapter), or the
 *   embed provider is unknown.
 * - `"failed"`: a file errored, or a live stream failed again after three
 *   reconnect attempts.
 * - `"blocked"`: the browser's autoplay policy rejected `play()`.
 */
export type ChannelPlayerErrorKind = "refused" | "unsupported" | "failed" | "blocked";

export interface ChannelPlayerLabels {
  /** Root region name. */
  player: string;
  play: string;
  pause: string;
  previous: string;
  next: string;
  shuffle: string;
  repeatOff: string;
  repeatAll: string;
  repeatOne: string;
  mute: string;
  volume: string;
  seek: string;
  /** Slots: `{elapsed}`, `{duration}`. */
  time: string;
  /** Shown after the browser blocked autoplay. */
  pressPlay: string;
  connecting: string;
  reconnecting: string;
  /** Slot: `{channel}`. */
  refused: string;
  /** Slot: `{channel}`. */
  failed: string;
  unsupported: string;
  /** Announced on a channel change. Slot: `{channel}`. */
  tuned: string;
  /** Announced on a track change. Slot: `{title}`. */
  trackChanged: string;
  /** Shown without a channel. */
  nothing: string;
}

export interface ChannelPlayerProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onError"> {
  channels: Channel[];
  /**
   * Controlled state, shared with ChannelGuide, Playlist and MediaQueue.
   * Nothing plays until `value.playing` is true. The player reports whole-
   * second progress in `value.position`, and moving `value.position` seeks.
   */
  value: ChannelPlayerValue;
  onChange: (next: ChannelPlayerValue) => void;
  onError?: (channelId: string, kind: ChannelPlayerErrorKind) => void;
  labels?: Partial<ChannelPlayerLabels>;
  liveLabels?: Partial<LiveBadgeLabels>;
  embedLabels?: Partial<MediaEmbedLabels>;
  /** Forwarded to the underlying `<audio>` / `<video>` element. */
  mediaRef?: Ref<HTMLMediaElement>;
}
