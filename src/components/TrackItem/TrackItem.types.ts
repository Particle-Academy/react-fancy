import type { HTMLAttributes, ReactNode } from "react";
import type { MediaTrack } from "../../utils/media-channel";

export interface TrackItemLabels {
  /** Read out beside the current track while it plays. */
  nowPlaying: string;
  /** The select button's name. Slots: `{title}`, `{artist}`. */
  play: string;
}

export interface TrackItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  track: MediaTrack;
  /** 1-based position, shown before the title. */
  index?: number;
  /** The current track. */
  active?: boolean;
  /** The current track is playing. */
  playing?: boolean;
  /** Makes the title a button. */
  onSelect?: (trackId: string) => void;
  /** Controls at the end of the row (Playlist's move / remove). */
  actions?: ReactNode;
  /** Every visible string. English defaults. */
  labels?: Partial<TrackItemLabels>;
}
