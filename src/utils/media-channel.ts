/**
 * The channel model: a channel is a single track, a playlist of tracks, or a
 * live stream from any service. Every shape is plain JSON, so a host, a server
 * or an agent can emit it.
 *
 * Every channel component (ChannelPlayer, ChannelGuide, Playlist, MediaQueue)
 * is controlled through ONE {@link ChannelPlayerValue}, and every move they
 * make goes through the pure functions below. An agent bridge calls the same
 * functions, so "next", "shuffle" or "remove" cannot mean one thing in the UI
 * and another to an agent.
 */

/** Where a track or a live channel plays from. */
export type ChannelSource =
  /** A finite file: MP3, M4A, MP4, WebM... Seekable. */
  | { type: "file"; url: string; mime?: string; media?: "audio" | "video" }
  /**
   * An endless stream. `protocol` defaults by guess: `.m3u8` is HLS, `.mpd` is
   * DASH, anything else is an Icecast / Shoutcast mount.
   */
  | { type: "stream"; url: string; protocol?: "icecast" | "hls" | "dash"; media?: "audio" | "video" }
  /** A provider's own player in an iframe: `youtube`, `vimeo`, `twitch`, or one a host registers. */
  | { type: "embed"; provider: string; id: string; params?: Record<string, string> };

export type EmbedSource = Extract<ChannelSource, { type: "embed" }>;

export interface MediaTrack {
  /** Stable identity: `value.trackId`, `data-track-id`. Unique within a channel. */
  id: string;
  title: string;
  artist?: string;
  album?: string;
  /** Seconds, when known up front (shown before the file loads). */
  duration?: number;
  /** Image URL. */
  artwork?: string;
  source: ChannelSource;
}

export type LiveStatus = "live" | "offline" | "starting" | "ended";

export interface ChannelBase {
  /** Stable identity: `value.channelId`, `data-channel-id`. */
  id: string;
  name: string;
  description?: string;
  artwork?: string;
  tags?: string[];
}

export type TrackChannel = ChannelBase & { kind: "track"; track: MediaTrack };
export type PlaylistChannel = ChannelBase & { kind: "playlist"; tracks: MediaTrack[] };
export type LiveChannel = ChannelBase & {
  kind: "live";
  source: ChannelSource;
  /** Supplied by the host (a provider API, an Icecast status poll). Default `"live"`. */
  status?: LiveStatus;
  /** What is on air, supplied by the host. */
  nowPlaying?: string;
};

export type Channel = TrackChannel | PlaylistChannel | LiveChannel;
export type ChannelKind = Channel["kind"];

export type RepeatMode = "off" | "all" | "one";

/** The whole state of a channel UI, in one JSON object. */
export interface ChannelPlayerValue {
  channelId: string | null;
  /** The current track: within a playlist, the track channel's own track, or `null` on live. */
  trackId: string | null;
  /** Whether the host wants media playing. Components set it back to `false` when the browser refuses. */
  playing: boolean;
  /** Seconds into the current track. Ignored on live. Moving it seeks. */
  position: number;
  /** 0..1 */
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** The shuffled play order (track ids), or `null` for playlist order. */
  order: string[] | null;
}

/** A playlist edit held for a person to confirm (an agent proposes, a human accepts). */
export type PendingQueueEdit =
  | { id: string; op: "remove"; trackId: string }
  | { id: string; op: "clear" }
  | { id: string; op: "replace"; tracks: MediaTrack[] };

type Random = () => number;

/** Seconds into a track before "previous" restarts it instead of going back. */
const RESTART_THRESHOLD = 3;

export function createChannelValue(patch: Partial<ChannelPlayerValue> = {}): ChannelPlayerValue {
  return {
    channelId: null,
    trackId: null,
    playing: false,
    position: 0,
    volume: 1,
    muted: false,
    shuffle: false,
    repeat: "off",
    order: null,
    ...patch,
  };
}

export function findChannel(channels: readonly Channel[], id: string | null | undefined): Channel | undefined {
  return id == null ? undefined : channels.find((c) => c.id === id);
}

/** The tracks a channel plays: one, the list, or none for live. */
export function channelTracks(channel: Channel | undefined): MediaTrack[] {
  if (!channel) return [];
  if (channel.kind === "track") return [channel.track];
  if (channel.kind === "playlist") return channel.tracks;
  return [];
}

/** Fisher-Yates over a copy; `first`, when given and present, leads. */
export function shuffleIds(ids: readonly string[], random: Random = Math.random, first?: string | null): string[] {
  const out = ids.filter((id) => id !== first);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return first != null && ids.includes(first) ? [first, ...out] : out;
}

/**
 * The order tracks play in. A held shuffle order is used only while it names
 * exactly the channel's tracks; a stale one (tracks added or removed since)
 * is repaired: unknown ids dropped, missing ones appended.
 */
export function playOrder(channel: Channel | undefined, value: ChannelPlayerValue): string[] {
  const ids = channelTracks(channel).map((t) => t.id);
  if (!value.shuffle || !value.order) return ids;
  const kept = value.order.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

export function currentTrack(channel: Channel | undefined, value: ChannelPlayerValue): MediaTrack | undefined {
  if (value.trackId == null) return undefined;
  return channelTracks(channel).find((t) => t.id === value.trackId);
}

/** Tune to a channel: its first track (in shuffle order when shuffling), from the start. */
export function selectChannel(
  value: ChannelPlayerValue,
  channel: Channel | undefined,
  random: Random = Math.random,
): ChannelPlayerValue {
  if (!channel) return { ...value, channelId: null, trackId: null, position: 0, order: null };
  const ids = channelTracks(channel).map((t) => t.id);
  const order = value.shuffle && channel.kind === "playlist" ? shuffleIds(ids, random) : null;
  return {
    ...value,
    channelId: channel.id,
    trackId: (order ?? ids)[0] ?? null,
    position: 0,
    order,
  };
}

export function selectTrack(value: ChannelPlayerValue, trackId: string): ChannelPlayerValue {
  return { ...value, trackId, position: 0 };
}

export function toggleShuffle(
  value: ChannelPlayerValue,
  channel: Channel | undefined,
  random: Random = Math.random,
): ChannelPlayerValue {
  if (value.shuffle) return { ...value, shuffle: false, order: null };
  const ids = channelTracks(channel).map((t) => t.id);
  return { ...value, shuffle: true, order: shuffleIds(ids, random, value.trackId) };
}

export function cycleRepeat(value: ChannelPlayerValue): ChannelPlayerValue {
  const next: Record<RepeatMode, RepeatMode> = { off: "all", all: "one", one: "off" };
  return { ...value, repeat: next[value.repeat] };
}

/** The next track by hand. At the end: wraps with repeat all, otherwise nothing changes. */
export function nextTrack(value: ChannelPlayerValue, channel: Channel | undefined): ChannelPlayerValue {
  const order = playOrder(channel, value);
  if (order.length === 0) return value;
  const at = value.trackId == null ? -1 : order.indexOf(value.trackId);
  if (at < order.length - 1) return selectTrack(value, order[at + 1]!);
  return value.repeat === "all" ? selectTrack(value, order[0]!) : value;
}

/** Restart a track more than 3s in; otherwise the one before (wrapping with repeat all). */
export function previousTrack(value: ChannelPlayerValue, channel: Channel | undefined): ChannelPlayerValue {
  const order = playOrder(channel, value);
  if (order.length === 0) return value;
  if (value.position > RESTART_THRESHOLD) return { ...value, position: 0 };
  const at = value.trackId == null ? 0 : order.indexOf(value.trackId);
  if (at > 0) return selectTrack(value, order[at - 1]!);
  if (value.repeat === "all") return selectTrack(value, order[order.length - 1]!);
  return { ...value, position: 0 };
}

/** What a track finishing does: replay, advance, wrap, or stop. */
export function trackEnded(value: ChannelPlayerValue, channel: Channel | undefined): ChannelPlayerValue {
  const order = playOrder(channel, value);
  if (order.length === 0) return { ...value, playing: false, position: 0 };
  if (value.repeat === "one" || (order.length === 1 && value.repeat === "all")) return { ...value, position: 0 };
  const at = value.trackId == null ? -1 : order.indexOf(value.trackId);
  if (at < order.length - 1) return selectTrack(value, order[at + 1]!);
  if (value.repeat === "all") return selectTrack(value, order[0]!);
  return { ...value, playing: false, position: 0 };
}

/** What plays after the current track, in play order (wrapping with repeat all). */
export function upNext(channel: Channel | undefined, value: ChannelPlayerValue): MediaTrack[] {
  const tracks = channelTracks(channel);
  const order = playOrder(channel, value);
  const at = value.trackId == null ? -1 : order.indexOf(value.trackId);
  const after = order.slice(at + 1);
  const ids = value.repeat === "all" && at >= 0 ? [...after, ...order.slice(0, at)] : after;
  return ids.map((id) => tracks.find((t) => t.id === id)!).filter(Boolean);
}

export function moveTrack(tracks: readonly MediaTrack[], trackId: string, toIndex: number): MediaTrack[] {
  const from = tracks.findIndex((t) => t.id === trackId);
  if (from < 0) return [...tracks];
  const out = tracks.filter((t) => t.id !== trackId);
  const to = Math.max(0, Math.min(out.length, Math.floor(toIndex)));
  out.splice(to, 0, tracks[from]!);
  return out;
}

/** Add a track (at the end, or at `index`). A duplicate id is refused: the same array comes back. */
export function addTrack<T extends readonly MediaTrack[]>(tracks: T, track: MediaTrack, index?: number): T | MediaTrack[] {
  if (tracks.some((t) => t.id === track.id)) return tracks;
  const out = [...tracks];
  out.splice(index == null ? out.length : Math.max(0, Math.min(out.length, index)), 0, track);
  return out;
}

export function removeTrack(tracks: readonly MediaTrack[], trackId: string): MediaTrack[] {
  return tracks.filter((t) => t.id !== trackId);
}

export function applyQueueEdit(tracks: readonly MediaTrack[], edit: PendingQueueEdit): MediaTrack[] {
  if (edit.op === "remove") return removeTrack(tracks, edit.trackId);
  if (edit.op === "clear") return [];
  return [...edit.tracks];
}

/**
 * Bring a value back in step after a channel's tracks changed. A current track
 * that was removed gives way to the one that took its place (or the first);
 * an emptied channel stops. A shuffle order keeps its sequence, drops removed
 * ids and appends added ones. Another channel's value comes back untouched.
 */
export function reconcileValue(
  value: ChannelPlayerValue,
  channel: Channel,
  previous?: Channel,
): ChannelPlayerValue {
  if (value.channelId !== channel.id) return value;
  const ids = channelTracks(channel).map((t) => t.id);
  const order = value.shuffle && value.order ? playOrder(channel, value) : null;
  const sameOrder =
    order === value.order ||
    (order !== null && value.order !== null && order.length === value.order.length && order.every((id, i) => id === value.order![i]));
  if (value.trackId != null && ids.includes(value.trackId)) {
    return sameOrder ? value : { ...value, order };
  }
  if (ids.length === 0) return { ...value, trackId: null, playing: false, position: 0, order: value.shuffle ? [] : null };
  // The first survivor after the removed track, in the order that was playing
  // (known from `previous`, or from a held shuffle order); else the first.
  const before = previous ? playOrder(previous, value) : (value.order ?? []);
  const oldIndex = value.trackId == null ? -1 : before.indexOf(value.trackId);
  const survivor = oldIndex >= 0 ? before.slice(oldIndex + 1).find((id) => ids.includes(id)) : undefined;
  return { ...value, trackId: survivor ?? (order ?? ids)[0]!, position: 0, order };
}
