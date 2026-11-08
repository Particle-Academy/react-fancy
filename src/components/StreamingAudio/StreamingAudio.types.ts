import type { HTMLAttributes, Ref } from "react";

/**
 * `"live"`: an endless Icecast / Shoutcast stream. No seeking; the connection
 * is dropped on pause and re-opened from the live edge on play.
 * `"file"`: a server-hosted file (an MP3, a podcast episode). Elapsed /
 * duration and seeking; pause keeps the position.
 */
export type StreamingStationKind = "live" | "file";

export interface StreamingStation {
  /** Stable identity: `value.stationId`, `data-streaming-station`. */
  id: string;
  /** Shown as the station heading and used as the Media Session artist. */
  name: string;
  /**
   * The audio address. Only absolute `http:` / `https:` URLs and same-origin
   * relative paths are played; anything else is refused with an error state.
   */
  src: string;
  /**
   * Defaults by guess: a `src` whose path ends in an audio file extension
   * (`.mp3`, `.m4a`, `.ogg`, ...) is `"file"`, anything else is `"live"`. An
   * Icecast mount named like a file (`/stream.mp3`) needs `kind: "live"`.
   */
  kind?: StreamingStationKind;
  /** Shown under the name in the `bar` layout. */
  description?: string;
  /** Image URL: shown beside the name and given to the Media Session. */
  artwork?: string;
  /** Shown beside the description in the `bar` layout. */
  genre?: string;
}

export interface StreamingAudioValue {
  /** The selected station, or `null` for none. */
  stationId: string | null;
  /** Whether the host wants audio playing. */
  playing: boolean;
  /** 0..1. */
  volume: number;
  muted: boolean;
}

/**
 * Why `onError` fired.
 * - `"refused"`: the station's `src` is not `http(s)` or same-origin relative.
 * - `"failed"`: a file errored, or a live stream failed again after three
 *   reconnect attempts.
 * - `"blocked"`: the browser's autoplay policy rejected `play()`.
 */
export type StreamingAudioErrorKind = "refused" | "failed" | "blocked";

export type StreamingAudioLayout = "bar" | "compact";

export interface StreamingAudioLabels {
  /** Root region name. */
  player: string;
  /** Station picker label (visually hidden). */
  station: string;
  /** Picker placeholder when no station is selected. */
  choose: string;
  play: string;
  pause: string;
  mute: string;
  volume: string;
  seek: string;
  /** The badge on a live station. */
  live: string;
  /** Elapsed / duration. Slots: `{elapsed}`, `{duration}`. */
  time: string;
  /** Shown after the browser blocked autoplay. */
  pressPlay: string;
  connecting: string;
  reconnecting: string;
  /** The src was refused. Slot: `{station}`. */
  refused: string;
  /** The stream or file failed. Slot: `{station}`. */
  failed: string;
  /** Announced on a station change. Slot: `{station}`. */
  tuned: string;
}

export interface StreamingAudioProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onError"> {
  stations: StreamingStation[];
  /** Controlled state. Nothing plays until `value.playing` is true. */
  value: StreamingAudioValue;
  onChange: (next: StreamingAudioValue) => void;
  /**
   * What is on air, supplied by the host. Browsers cannot read ICY
   * (Icecast/Shoutcast) metadata from an `<audio>` element, so poll it on the
   * server (Icecast's `/status-json.xsl`, Shoutcast's `/currentsong`) and pass
   * it in.
   */
  nowPlaying?: string;
  onError?: (stationId: string, kind: StreamingAudioErrorKind) => void;
  /** Every visible string. English defaults. */
  labels?: Partial<StreamingAudioLabels>;
  /** Default `"bar"`. `"compact"` drops the artwork, description and button text. */
  layout?: StreamingAudioLayout;
  /** Forwarded to the underlying `<audio>` element. */
  audioRef?: Ref<HTMLAudioElement>;
}
