import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";
import { fillLabel } from "../../utils/label-template";
import { formatMediaTime } from "../../utils/format-media-time";
import { visuallyHidden } from "../../utils/visually-hidden";
import { useId } from "../../hooks/use-id";
import { isPlayableSrc } from "../StreamingAudio/station-src";
import {
  currentTrack,
  cycleRepeat,
  findChannel,
  nextTrack,
  previousTrack,
  toggleShuffle,
  trackEnded,
} from "../../utils/media-channel";
import { resolveMediaAdapter, sourceMedia } from "../../utils/media-sources";
import { Button } from "../Button/Button";
import { Slider } from "../inputs/Slider/Slider";
import { MediaEmbed } from "../MediaEmbed/MediaEmbed";
import { NowPlaying } from "../NowPlaying/NowPlaying";
import { CONTROL_OUTLINE, SURFACE, TEXT_MUTED, TEXT_SOFT } from "./media-classes";
import type { ChannelPlayerValue, ChannelSource, RepeatMode } from "../../utils/media-channel";
import type { ChannelPlayerErrorKind, ChannelPlayerLabels, ChannelPlayerProps } from "./ChannelPlayer.types";

const DEFAULT_LABELS: ChannelPlayerLabels = {
  player: "Media player",
  play: "Play",
  pause: "Pause",
  previous: "Previous",
  next: "Next",
  shuffle: "Shuffle",
  repeatOff: "Repeat: off",
  repeatAll: "Repeat: all",
  repeatOne: "Repeat: one",
  mute: "Mute",
  volume: "Volume",
  seek: "Seek",
  time: "{elapsed} / {duration}",
  pressPlay: "Press play to listen",
  connecting: "Connecting...",
  reconnecting: "Reconnecting...",
  refused: "{channel} can't be played from this address.",
  failed: "Couldn't connect to {channel}.",
  unsupported: "This stream can't play in this browser.",
  tuned: "Now on {channel}",
  trackChanged: "Now playing {title}",
  nothing: "Nothing playing",
};

/** Reconnect attempts for a live stream before it is shown as failed. */
const MAX_RETRIES = 3;
/** First backoff step; each further attempt doubles it (1s, 2s, 4s). */
const RETRY_BASE_MS = 1000;
/** How far `value.position` may drift from the element before it counts as a seek. */
const SEEK_TOLERANCE = 1.5;

const REPEAT_ICON: Record<RepeatMode, string> = { off: "repeat", all: "repeat", one: "repeat-1" };

type Status = "idle" | "connecting" | "playing" | "reconnecting";
type Failure = "refused" | "unsupported" | "failed" | null;

const clampVolume = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);

interface MediaSessionLike {
  metadata: unknown;
  playbackState?: string;
  setActionHandler?: (action: string, handler: (() => void) | null) => void;
}

function mediaSession(): MediaSessionLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { mediaSession?: MediaSessionLike }).mediaSession ?? null;
}

function setHandler(ms: MediaSessionLike, action: string, fn: (() => void) | null) {
  try {
    ms.setActionHandler?.(action, fn);
  } catch {
    // An engine without this action throws; nothing to do.
  }
}

/**
 * One controlled player for every channel kind: a single track, a playlist
 * (previous / next, shuffle, repeat, auto-advance) or a live stream (no seek,
 * reconnect with backoff), on `<audio>`, `<video>` or a provider embed.
 *
 * Which sources play is decided by the adapter registry in
 * `utils/media-sources`: natively files, Icecast / Shoutcast and HLS where the
 * browser has it; anything else (hls.js, dash.js) is a host-registered adapter.
 */
export const ChannelPlayer = forwardRef<HTMLDivElement, ChannelPlayerProps>(function ChannelPlayer(
  { channels, value, onChange, onError, labels: labelsProp, liveLabels, embedLabels, mediaRef, id, className, ...rest },
  ref,
) {
  const generated = useId("channel-player");
  const base = id ?? generated;
  const labels: ChannelPlayerLabels = { ...DEFAULT_LABELS, ...labelsProp };

  const channel = findChannel(channels, value.channelId);
  const track = currentTrack(channel, value);
  const source: ChannelSource | undefined = channel?.kind === "live" ? channel.source : track?.source;
  const isLive = channel?.kind === "live";
  const isPlaylist = channel?.kind === "playlist";
  const isEmbed = source?.type === "embed";
  const media = source && !isEmbed ? sourceMedia(source) : "audio";
  const url = source && source.type !== "embed" ? source.url : "";
  const sourceKey = source && channel ? `${channel.id}|${track?.id ?? ""}|${source.type}|${url}|${media}` : "";

  const el = useRef<HTMLMediaElement | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<Failure>(null);
  const [blocked, setBlocked] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [time, setTime] = useState({ current: 0, duration: Number.NaN });

  const latest = useRef({ value, onChange, onError, channel, source, isLive, labels, sourceKey });
  latest.current = { value, onChange, onError, channel, source, isLive, labels, sourceKey };

  const detachRef = useRef<(() => void) | null>(null);
  const attachedKey = useRef<string | null>(null);
  /** The source that was refused or is unsupported: nothing tries to play it. */
  const deadKey = useRef<string | null>(null);
  const attempts = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const lastReported = useRef(-1);

  const report = (kind: ChannelPlayerErrorKind) => {
    const c = latest.current.channel;
    if (c) latest.current.onError?.(c.id, kind);
  };
  const stopPlaying = () => {
    const l = latest.current;
    if (l.value.playing) l.onChange({ ...l.value, playing: false });
  };
  const clearRetry = () => {
    clearTimeout(retryTimer.current);
    retryTimer.current = undefined;
  };

  const detach = () => {
    generation.current++;
    const d = detachRef.current;
    detachRef.current = null;
    attachedKey.current = null;
    d?.();
  };

  const attach = (): boolean => {
    const node = el.current;
    const { source: s, sourceKey: k } = latest.current;
    if (!node || !s || s.type === "embed") return false;
    const adapter = resolveMediaAdapter(s, node);
    if (!adapter) return false;
    detach();
    detachRef.current = adapter.attach(node, s);
    attachedKey.current = k;
    return true;
  };

  const startPlay = (node: HTMLMediaElement) => {
    const gen = generation.current;
    let pending: Promise<void> | undefined;
    try {
      pending = node.play();
    } catch {
      return;
    }
    if (!pending || typeof pending.then !== "function") return;
    pending.then(
      () => {
        if (gen === generation.current) setStatus("playing");
      },
      (err: unknown) => {
        if (gen !== generation.current) return;
        if ((err as { name?: string } | null)?.name !== "NotAllowedError") return;
        setBlocked(true);
        setStatus("idle");
        report("blocked");
        stopPlaying();
      },
    );
  };

  const connect = () => {
    const node = el.current;
    if (!node) return;
    if (latest.current.isLive || attachedKey.current !== latest.current.sourceKey) {
      if (!attach()) return;
    }
    setStatus((s) => (s === "reconnecting" ? s : "connecting"));
    startPlay(node);
  };

  const fail = () => {
    clearRetry();
    detach();
    setStatus("idle");
    setFailure("failed");
    report("failed");
    stopPlaying();
  };

  const onTrouble = (cause: "error" | "stalled") => {
    const l = latest.current;
    if (!l.value.playing || attachedKey.current === null) return;
    if (!l.isLive) {
      if (cause === "error") fail();
      return;
    }
    if (retryTimer.current !== undefined) return;
    if (attempts.current >= MAX_RETRIES) {
      fail();
      return;
    }
    const delay = RETRY_BASE_MS * 2 ** attempts.current;
    attempts.current++;
    setStatus("reconnecting");
    retryTimer.current = setTimeout(() => {
      retryTimer.current = undefined;
      if (latest.current.value.playing) connect();
    }, delay);
  };

  // -- a new source: reset, refuse what cannot play --------------------------
  useEffect(() => {
    attempts.current = 0;
    lastReported.current = -1;
    clearRetry();
    detach();
    setBlocked(false);
    setTime({ current: 0, duration: track?.duration ?? Number.NaN });
    deadKey.current = null;
    const s = latest.current.source;
    const node = el.current;
    if (!s || s.type === "embed" || !node) {
      setFailure(null);
      setStatus("idle");
      return;
    }
    if (!isPlayableSrc(s.url)) {
      deadKey.current = sourceKey;
      setFailure("refused");
      report("refused");
      stopPlaying();
      return;
    }
    if (!resolveMediaAdapter(s, node)) {
      deadKey.current = sourceKey;
      setFailure("unsupported");
      report("unsupported");
      stopPlaying();
      return;
    }
    setFailure(null);
  }, [sourceKey]);

  // -- the connection follows value.playing -----------------------------------
  useEffect(() => {
    const node = el.current;
    if (!node || !sourceKey || isEmbed || deadKey.current === sourceKey) return;
    clearRetry();
    if (value.playing) {
      setBlocked(false);
      connect();
      return;
    }
    setStatus("idle");
    if (isLive) detach();
    else if (attachedKey.current !== null) {
      generation.current++;
      try {
        node.pause();
      } catch {
        // ignore
      }
    }
  }, [sourceKey, value.playing]);

  // -- moving value.position seeks -------------------------------------------
  useEffect(() => {
    const node = el.current;
    if (!node || isLive || attachedKey.current === null) return;
    if (Math.abs(node.currentTime - value.position) > SEEK_TOLERANCE) {
      node.currentTime = value.position;
      lastReported.current = Math.floor(value.position);
    }
  }, [value.position, sourceKey]);

  // -- volume ------------------------------------------------------------------
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    node.volume = clampVolume(value.volume);
    node.muted = value.muted;
  }, [value.volume, value.muted, media]);

  // -- announcements -----------------------------------------------------------
  const prev = useRef<{ channel?: string; track?: string } | null>(null);
  const channelName = channel?.name ?? "";
  const trackTitle = track?.title ?? "";
  useEffect(() => {
    const before = prev.current;
    prev.current = { channel: channel?.id, track: track?.id };
    if (!before) return;
    if (channel && before.channel !== channel.id) setAnnouncement(fillLabel(labels.tuned, { channel: channelName }));
    else if (track && before.track !== track.id) setAnnouncement(fillLabel(labels.trackChanged, { title: trackTitle }));
  }, [channel?.id, track?.id]);

  const failureText =
    failure === "refused"
      ? fillLabel(labels.refused, { channel: channelName })
      : failure === "failed"
        ? fillLabel(labels.failed, { channel: channelName })
        : failure === "unsupported"
          ? labels.unsupported
          : "";
  useEffect(() => {
    if (failureText) setAnnouncement(failureText);
  }, [failureText]);

  useEffect(
    () => () => {
      clearTimeout(retryTimer.current);
      detachRef.current?.();
    },
    [],
  );

  // -- controls ------------------------------------------------------------------
  const set = (next: ChannelPlayerValue) => onChange(next);
  const requestPlaying = (playing: boolean) => {
    const l = latest.current;
    if (playing) {
      if (!l.channel || deadKey.current === l.sourceKey) return;
      setBlocked(false);
      setFailure(null);
      attempts.current = 0;
    }
    l.onChange({ ...l.value, playing });
  };

  // -- Media Session -------------------------------------------------------------
  const hasChannel = channel !== undefined;
  useEffect(() => {
    const ms = mediaSession();
    if (!ms || !hasChannel) return;
    setHandler(ms, "play", () => requestPlaying(true));
    setHandler(ms, "pause", () => requestPlaying(false));
    setHandler(ms, "nexttrack", () => {
      const l = latest.current;
      l.onChange(nextTrack(l.value, l.channel));
    });
    setHandler(ms, "previoustrack", () => {
      const l = latest.current;
      l.onChange(previousTrack(l.value, l.channel));
    });
    return () => {
      for (const a of ["play", "pause", "nexttrack", "previoustrack"]) setHandler(ms, a, null);
      try {
        ms.metadata = null;
      } catch {
        // ignore
      }
    };
  }, [hasChannel]);

  const artwork = track?.artwork ?? channel?.artwork;
  const liveNow = channel?.kind === "live" ? channel.nowPlaying : undefined;
  useEffect(() => {
    const ms = mediaSession();
    if (!ms || !channelName) return;
    const Metadata = (globalThis as { MediaMetadata?: new (init: Record<string, unknown>) => unknown }).MediaMetadata;
    if (typeof Metadata === "function") {
      try {
        ms.metadata = new Metadata({
          title: liveNow || trackTitle || channelName,
          artist: track?.artist ?? channelName,
          album: channelName,
          artwork: artwork ? [{ src: artwork }] : [],
        });
      } catch {
        // A malformed artwork URL throws in some engines.
      }
    }
    try {
      ms.playbackState = value.playing ? "playing" : "paused";
    } catch {
      // ignore
    }
  }, [channelName, trackTitle, liveNow, artwork, value.playing]);

  // -- render ----------------------------------------------------------------------
  const playing = value.playing;
  const statusText =
    playing && status === "reconnecting" ? labels.reconnecting : playing && status === "connecting" ? labels.connecting : "";
  const duration = Number.isFinite(time.duration) ? Math.floor(time.duration) : 0;
  const volumePct = Math.round(clampVolume(value.volume) * 100);
  const repeatLabel = value.repeat === "one" ? labels.repeatOne : value.repeat === "all" ? labels.repeatAll : labels.repeatOff;
  const seekable = !!source && !isLive && !isEmbed;

  const mediaProps = {
    ref: composeRefs(el, mediaRef) as (node: HTMLMediaElement | null) => void,
    "data-channel-media": media,
    preload: "none" as const,
    onError: () => onTrouble("error"),
    onStalled: () => onTrouble("stalled"),
    onPlaying: () => {
      attempts.current = 0;
      clearRetry();
      setStatus("playing");
    },
    onEnded: () => {
      const l = latest.current;
      const next = trackEnded(l.value, l.channel);
      const node = el.current;
      if (node && next.playing && next.trackId === l.value.trackId) {
        node.currentTime = 0;
        startPlay(node);
      }
      l.onChange(next);
    },
    onTimeUpdate: (e: { currentTarget: HTMLMediaElement }) => {
      const l = latest.current;
      if (l.isLive) return;
      const node = e.currentTarget;
      setTime({ current: node.currentTime, duration: node.duration });
      const s = Math.floor(node.currentTime);
      if (s !== lastReported.current) {
        lastReported.current = s;
        if (s !== l.value.position) l.onChange({ ...l.value, position: s });
      }
    },
    onDurationChange: (e: { currentTarget: HTMLMediaElement }) =>
      setTime({ current: e.currentTarget.currentTime, duration: e.currentTarget.duration }),
    onLoadedMetadata: (e: { currentTarget: HTMLMediaElement }) => {
      const node = e.currentTarget;
      const want = latest.current.value.position;
      if (!latest.current.isLive && want > 0 && Math.abs(node.currentTime - want) > SEEK_TOLERANCE) node.currentTime = want;
      setTime({ current: node.currentTime, duration: node.duration });
    },
  };

  return (
    <div
      ref={ref}
      id={base}
      role="region"
      aria-label={labels.player}
      data-react-fancy-channel-player=""
      data-channel-id={channel?.id ?? ""}
      data-channel-kind={channel?.kind ?? ""}
      data-track-id={track?.id ?? ""}
      data-channel-playing={playing ? "true" : "false"}
      className={cn("flex flex-col gap-3 rounded-lg border p-3", SURFACE, className)}
      {...rest}
    >
      {isEmbed && source?.type === "embed" ? (
        <MediaEmbed
          key={sourceKey}
          source={source}
          playing={playing}
          title={channel?.kind === "live" ? channel.name : track?.title}
          poster={artwork}
          onPlayingChange={(p) => requestPlaying(p)}
          onError={() => {
            setFailure("unsupported");
            report("unsupported");
            stopPlaying();
          }}
          labels={embedLabels}
        />
      ) : media === "video" ? (
        <video {...mediaProps} playsInline className={cn("aspect-video w-full rounded-md bg-black", !source && "hidden")} />
      ) : (
        <audio {...mediaProps} />
      )}

      <div className="flex min-w-0 flex-col gap-1">
        <NowPlaying channel={channel} track={track} size="sm" labels={{ nothing: labels.nothing }} liveLabels={liveLabels} />
        {statusText && (
          <span data-channel-status="" className={cn("text-xs", TEXT_MUTED)}>
            {statusText}
          </span>
        )}
        {blocked && !playing && (
          <span data-channel-hint="" className={cn("text-xs", TEXT_SOFT)}>
            {labels.pressPlay}
          </span>
        )}
        {failureText && (
          <span data-channel-error="" className="text-xs text-red-600 dark:text-red-400">
            {failureText}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isPlaylist && (
          <Button
            type="button"
            size="sm"
            icon="skip-back"
            data-channel-control="prev"
            aria-label={labels.previous}
            onClick={() => set(previousTrack(value, channel))}
            className={CONTROL_OUTLINE}
          />
        )}
        <Button
          type="button"
          size="sm"
          data-channel-control="play"
          aria-label={playing ? labels.pause : labels.play}
          icon={playing ? "pause" : "play"}
          disabled={!channel || !source}
          onClick={() => requestPlaying(!playing)}
          className={CONTROL_OUTLINE}
        />
        {isPlaylist && (
          <Button
            type="button"
            size="sm"
            icon="skip-forward"
            data-channel-control="next"
            aria-label={labels.next}
            onClick={() => set(nextTrack(value, channel))}
            className={CONTROL_OUTLINE}
          />
        )}
        {isPlaylist && (
          <Button
            type="button"
            size="sm"
            icon="shuffle"
            data-channel-control="shuffle"
            aria-label={labels.shuffle}
            aria-pressed={value.shuffle}
            active={value.shuffle}
            onClick={() => set(toggleShuffle(value, channel))}
            className={CONTROL_OUTLINE}
          />
        )}
        {channel && !isLive && (
          <Button
            type="button"
            size="sm"
            icon={REPEAT_ICON[value.repeat]}
            data-channel-control="repeat"
            data-repeat={value.repeat}
            aria-label={repeatLabel}
            active={value.repeat !== "off"}
            onClick={() => set(cycleRepeat(value))}
            className={CONTROL_OUTLINE}
          />
        )}
        {!isEmbed && (
          <>
            <Button
              type="button"
              size="sm"
              data-channel-control="mute"
              aria-label={labels.mute}
              aria-pressed={value.muted}
              icon={value.muted ? "volume-x" : "volume-2"}
              onClick={() => set({ ...value, muted: !value.muted })}
              className={CONTROL_OUTLINE}
            />
            <div data-channel-control="volume" className="w-28">
              <Slider
                id={`${base}-volume`}
                size="sm"
                label={labels.volume}
                labelHidden
                min={0}
                max={100}
                step={1}
                value={volumePct}
                onValueChange={(v) => set({ ...value, volume: v / 100 })}
              />
            </div>
          </>
        )}
      </div>

      {seekable && (
        <div className="flex w-full items-center gap-3">
          <div data-channel-control="seek" className="flex-1">
            <Slider
              id={`${base}-seek`}
              size="sm"
              label={labels.seek}
              labelHidden
              min={0}
              max={duration}
              step={1}
              disabled={duration === 0}
              value={Math.min(Math.floor(time.current), duration)}
              onValueChange={(v) => {
                const node = el.current;
                if (node) node.currentTime = v;
                lastReported.current = v;
                setTime((t) => ({ ...t, current: v }));
                set({ ...value, position: v });
              }}
            />
          </div>
          <span data-channel-time="" className={cn("shrink-0 text-xs tabular-nums", TEXT_MUTED)}>
            {fillLabel(labels.time, { elapsed: formatMediaTime(time.current), duration: formatMediaTime(time.duration) })}
          </span>
        </div>
      )}

      <div aria-live="polite" data-channel-announce="" className="sr-only" style={visuallyHidden}>
        {announcement}
      </div>
    </div>
  );
});

ChannelPlayer.displayName = "ChannelPlayer";
