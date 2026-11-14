import type { HTMLAttributes } from "react";
import type { Channel, ChannelPlayerValue, MediaTrack, PendingQueueEdit } from "../../utils/media-channel";
import type { TrackItemLabels } from "../TrackItem/TrackItem.types";

export interface PlaylistLabels {
  /** The list's accessible name. Slot: `{channel}`. */
  list: string;
  /** Slot: `{count}`. */
  count: string;
  countOne: string;
  shuffle: string;
  /** The repeat button, by mode. */
  repeatOff: string;
  repeatAll: string;
  repeatOne: string;
  /** Slot: `{title}`. */
  moveUp: string;
  moveDown: string;
  remove: string;
  /** The library picker. */
  library: string;
  chooseTrack: string;
  add: string;
  /** A staged removal, shown on the row. */
  pendingRemove: string;
  /** A staged clear / replace, shown above the list. Slot: `{count}` (replace). */
  pendingClear: string;
  pendingReplace: string;
  accept: string;
  reject: string;
  empty: string;
}

export interface PlaylistProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** A playlist (editable) or a track channel (its one track, read-only). */
  channel: Channel;
  /** The shared channel value. Selecting a track tunes to this channel if the value is on another. */
  value: ChannelPlayerValue;
  onChange: (next: ChannelPlayerValue) => void;
  /**
   * Turns on reorder, remove and add. The playlist's tracks are host data, so
   * the edited list comes back here; the value is kept in step through `onChange`.
   */
  onTracksChange?: (channelId: string, tracks: MediaTrack[]) => void;
  /** Tracks that can be added (those already in the list are not offered). */
  library?: MediaTrack[];
  /**
   * Edits proposed (by an agent, a collaborator) and held for a person. Each is
   * shown in place with Accept / Reject; nothing changes until it is accepted.
   */
  pendingEdits?: PendingQueueEdit[];
  /** Accept applies the edit (through `onTracksChange`) and then reports it here. */
  onResolvePending?: (editId: string, accepted: boolean) => void;
  /** Hide the shuffle / repeat header. */
  hideModes?: boolean;
  labels?: Partial<PlaylistLabels>;
  trackLabels?: Partial<TrackItemLabels>;
}
