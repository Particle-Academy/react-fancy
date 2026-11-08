import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";
import { fillLabel } from "../../utils/label-template";
import { visuallyHidden } from "../../utils/visually-hidden";
import { useId } from "../../hooks/use-id";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Select } from "../inputs/Select/Select";
import { Slider } from "../inputs/Slider/Slider";
import { guessStationKind, isPlayableSrc } from "./station-src";
import type {
  StreamingAudioErrorKind,
  StreamingAudioLabels,
  StreamingAudioProps,
  StreamingAudioValue,
  StreamingStation,
  StreamingStationKind,
} from "./StreamingAudio.types";

const DEFAULT_LABELS: StreamingAudioLabels = {
  player: "Audio player",
  station: "Station",
  choose: "Choose a station",
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  volume: "Volume",
  seek: "Seek",
  live: "LIVE",
  time: "{elapsed} / {duration}",
  pressPlay: "Press play to listen",
  connecting: "Connecting...",
  reconnecting: "Reconnecting...",
  refused: "{station} can't be played from this address.",
  failed: "Couldn't connect to {station}.",
  tuned: "Station: {station}",
};

/** Reconnect attempts for a live stream before it is shown as failed. */
const MAX_RETRIES = 3;
/** First backoff step; each further attempt doubles it (1s, 2s, 4s). */
const RETRY_BASE_MS = 1000;

/**
 * Control outlines on the strong border token (6.15.0, WCAG 1.4.11). Button's
 * default variant rests on `--fancy-border`; these buttons are the player's
 * controls, so they read `--fancy-border-strong` like every form control.
 */
const CONTROL_OUTLINE =
  "border-[color:var(--fancy-border-strong,var(--color-zinc-500))] dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-500))]";

type Status = "idle" | "connecting" | "playing" | "reconnecting";
type Failure = "refused" | "failed" | null;
type RetryCause = "error" | "stalled";

const clampVolume = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

interface MediaSessionLike {
  metadata: unknown;
  playbackState?: string;
  setActionHandler?: (action: string, handler: (() => void) | null) => void;
}

/** Read at effect time only: never during render, so the server renders. */
function mediaSession(): MediaSessionLike | null {
  if (typeof navigator === "undefined") return null;
  return ((navigator as unknown as { mediaSession?: MediaSessionLike }).mediaSession) ?? null;
}

function setHandler(ms: MediaSessionLike, action: string, fn: (() => void) | null) {
  try {
    ms.setActionHandler?.(action, fn);
  } catch {
    // An engine that does not support this action throws; nothing to do.
  }
}

/**
 * A player for server-hosted MP3s and Icecast / Shoutcast live streams, on the
 * native `<audio>` element only.
 *
 * Fully controlled through `value` / `onChange`: nothing plays until
 * `value.playing` is true, and the component reports back (`playing: false`)
 * when the browser blocks autoplay or a stream gives up.
 */
export const StreamingAudio = forwardRef<HTMLDivElement, StreamingAudioProps>(function StreamingAudio(
  {
    stations,
    value,
    onChange,
    nowPlaying,
    onError,
    labels: labelsProp,
    layout = "bar",
    audioRef,
    id,
    className,
    ...rest
  },
  ref,
) {
  const generated = useId("streaming-audio");
  const base = id ?? generated;
  const labels: StreamingAudioLabels = { ...DEFAULT_LABELS, ...labelsProp };

  const station: StreamingStation | undefined =
    value.stationId == null ? undefined : stations.find((s) => s.id === value.stationId);
  const kind: StreamingStationKind | undefined = station
    ? (station.kind ?? guessStationKind(station.src))
    : undefined;
  const playable = station ? isPlayableSrc(station.src) : false;
  const stationKey = station?.id;
  const src = station?.src;

  const audioEl = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<Failure>(null);
  const [blocked, setBlocked] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [time, setTime] = useState({ current: 0, duration: Number.NaN });

  // Latest props for media events, timers and promises, which fire after a
  // render or two.
  const latest = useRef({ value, onChange, onError, station, kind, labels });
  latest.current = { value, onChange, onError, station, kind, labels };

  const attempts = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryCause = useRef<RetryCause | null>(null);
  /** Bumped on every connect / detach, so a stale play() promise is ignored. */
  const generation = useRef(0);

  const report = (stationId: string, errorKind: StreamingAudioErrorKind) => {
    latest.current.onError?.(stationId, errorKind);
  };

  const clearRetry = () => {
    clearTimeout(retryTimer.current);
    retryTimer.current = undefined;
    retryCause.current = null;
  };

  /** Close the connection: pause, drop the src, and load() so the fetch stops. */
  const detach = () => {
    const audio = audioEl.current;
    if (!audio) return;
    generation.current++;
    // Nothing attached (first mount, or already dropped): nothing to close.
    if (audio.hasAttribute("src")) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  };

  const startPlay = (audio: HTMLAudioElement, gen: number) => {
    let pending: Promise<void> | undefined;
    try {
      pending = audio.play();
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
        // AbortError: interrupted by a newer load or a pause. Not a failure.
        // Other rejections arrive as an `error` event, which retries.
        if ((err as { name?: string } | null)?.name !== "NotAllowedError") return;
        const l = latest.current;
        setBlocked(true);
        setStatus("idle");
        if (l.station) report(l.station.id, "blocked");
        // Once. A parent that ignores this keeps value.playing true, which
        // changes no dependency, so nothing calls play() again until it does.
        if (l.value.playing) l.onChange({ ...l.value, playing: false });
      },
    );
  };

  /** Attach (live: always afresh, from the live edge) and play. */
  const connect = (url: string, k: StreamingStationKind) => {
    const audio = audioEl.current;
    if (!audio) return;
    const gen = ++generation.current;
    if (k === "live" || audio.getAttribute("src") !== url) {
      audio.setAttribute("src", url);
      audio.load();
    }
    setStatus((s) => (s === "reconnecting" ? s : "connecting"));
    startPlay(audio, gen);
  };

  const fail = () => {
    const l = latest.current;
    clearRetry();
    detach();
    setStatus("idle");
    setFailure("failed");
    if (l.station) report(l.station.id, "failed");
    if (l.value.playing) l.onChange({ ...l.value, playing: false });
  };

  const onTrouble = (cause: RetryCause) => {
    const audio = audioEl.current;
    const l = latest.current;
    // A dropped connection while paused, or an element with nothing attached,
    // is not a failure.
    if (!audio || !l.value.playing || !l.station || !audio.hasAttribute("src")) return;
    if (l.kind === "file") {
      if (cause === "error") fail();
      return;
    }
    if (retryTimer.current !== undefined) return; // one retry in flight at a time
    if (attempts.current >= MAX_RETRIES) {
      fail();
      return;
    }
    const delay = RETRY_BASE_MS * 2 ** attempts.current;
    attempts.current++;
    retryCause.current = cause;
    setStatus("reconnecting");
    retryTimer.current = setTimeout(() => {
      retryTimer.current = undefined;
      retryCause.current = null;
      const now = latest.current;
      if (now.value.playing && now.station && now.kind) connect(now.station.src, now.kind);
    }, delay);
  };

  // -- station change: reset per-station state, refuse, announce ------------
  const previousStation = useRef<string | undefined>(undefined);
  const mountedOnce = useRef(false);
  useEffect(() => {
    attempts.current = 0;
    clearRetry();
    setBlocked(false);
    setTime({ current: 0, duration: Number.NaN });
    const l = latest.current;
    if (l.station && !isPlayableSrc(l.station.src)) {
      setFailure("refused");
      report(l.station.id, "refused");
    } else {
      setFailure(null);
    }
    if (mountedOnce.current && l.station && previousStation.current !== l.station.id) {
      setAnnouncement(fillLabel(l.labels.tuned, { station: l.station.name }));
    }
    mountedOnce.current = true;
    previousStation.current = l.station?.id;
  }, [stationKey, src]);

  // -- the connection follows value.playing ---------------------------------
  useEffect(() => {
    const audio = audioEl.current;
    if (!audio) return;
    clearRetry();
    const l = latest.current;
    if (!l.station || !l.kind) {
      detach();
      setStatus("idle");
      return;
    }
    if (!playable) {
      detach();
      setStatus("idle");
      if (l.value.playing) l.onChange({ ...l.value, playing: false });
      return;
    }
    if (value.playing) {
      connect(l.station.src, l.kind);
      return;
    }
    setStatus("idle");
    if (l.kind === "live") {
      detach();
    } else {
      generation.current++;
      if (audio.hasAttribute("src")) audio.pause();
      if (audio.getAttribute("src") !== l.station.src) audio.setAttribute("src", l.station.src);
    }
  }, [stationKey, src, kind, playable, value.playing]);

  // -- volume ---------------------------------------------------------------
  useEffect(() => {
    const audio = audioEl.current;
    if (!audio) return;
    audio.volume = clampVolume(value.volume);
    audio.muted = value.muted;
  }, [value.volume, value.muted]);

  // -- errors reach the live region -----------------------------------------
  const stationName = station?.name ?? "";
  const failureText =
    failure === "refused"
      ? fillLabel(labels.refused, { station: stationName })
      : failure === "failed"
        ? fillLabel(labels.failed, { station: stationName })
        : "";
  useEffect(() => {
    if (failureText) setAnnouncement(failureText);
  }, [failureText]);

  // -- timers die with the component ----------------------------------------
  useEffect(() => () => clearTimeout(retryTimer.current), []);

  // -- controls -------------------------------------------------------------
  const requestPlaying = (playing: boolean) => {
    const l = latest.current;
    if (playing) {
      if (!l.station || !isPlayableSrc(l.station.src)) return;
      setBlocked(false);
      setFailure(null);
      attempts.current = 0;
    }
    l.onChange({ ...l.value, playing });
  };

  // -- Media Session --------------------------------------------------------
  const hasStation = station !== undefined;
  useEffect(() => {
    const ms = mediaSession();
    if (!ms || !hasStation) return;
    setHandler(ms, "play", () => requestPlaying(true));
    setHandler(ms, "pause", () => requestPlaying(false));
    return () => {
      setHandler(ms, "play", null);
      setHandler(ms, "pause", null);
      try {
        ms.metadata = null;
      } catch {
        // ignore
      }
    };
  }, [hasStation]);

  const artwork = station?.artwork;
  useEffect(() => {
    const ms = mediaSession();
    if (!ms || !stationName) return;
    const Metadata = (globalThis as { MediaMetadata?: new (init: Record<string, unknown>) => unknown })
      .MediaMetadata;
    if (typeof Metadata === "function") {
      try {
        ms.metadata = new Metadata({
          title: nowPlaying || stationName,
          artist: stationName,
          artwork: artwork ? [{ src: artwork }] : [],
        });
      } catch {
        // A malformed artwork URL throws in some engines; keep going.
      }
    }
    try {
      ms.playbackState = value.playing ? "playing" : "paused";
    } catch {
      // ignore
    }
  }, [stationName, nowPlaying, artwork, value.playing]);

  // -- render ---------------------------------------------------------------
  const isLive = kind === "live";
  const isFile = kind === "file";
  const compact = layout === "compact";
  const playing = value.playing;
  const statusText =
    playing && status === "reconnecting"
      ? labels.reconnecting
      : playing && status === "connecting"
        ? labels.connecting
        : "";
  const duration = Number.isFinite(time.duration) ? Math.floor(time.duration) : 0;
  const volumePct = Math.round(clampVolume(value.volume) * 100);

  const setValue = (patch: Partial<StreamingAudioValue>) => onChange({ ...value, ...patch });

  return (
    <div
      ref={ref}
      id={base}
      role="region"
      aria-label={labels.player}
      data-react-fancy-streaming-audio=""
      data-streaming-station={station?.id ?? ""}
      data-streaming-kind={kind ?? ""}
      data-streaming-playing={playing ? "true" : "false"}
      data-layout={layout}
      className={cn(
        "relative flex flex-wrap items-center gap-3 rounded-lg border p-3",
        "border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))]",
        "dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
        compact && "gap-2 p-2",
        className,
      )}
      {...rest}
    >
      <audio
        ref={composeRefs(audioEl, audioRef)}
        preload="none"
        onError={() => onTrouble("error")}
        onStalled={() => onTrouble("stalled")}
        onPlaying={() => {
          attempts.current = 0;
          if (retryCause.current === "stalled") clearRetry();
          setStatus("playing");
        }}
        onTimeUpdate={(e) => {
          // A stall that recovers on its own cancels its pending retry.
          if (retryCause.current === "stalled") {
            clearRetry();
            setStatus("playing");
          }
          if (latest.current.kind !== "file") return;
          const el = e.currentTarget;
          setTime({ current: el.currentTime, duration: el.duration });
        }}
        onDurationChange={(e) => {
          const el = e.currentTarget;
          setTime({ current: el.currentTime, duration: el.duration });
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          setTime({ current: el.currentTime, duration: el.duration });
        }}
      />

      {!compact && station?.artwork && (
        <img
          src={station.artwork}
          alt=""
          className="h-12 w-12 shrink-0 rounded-md object-cover"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            data-streaming-station-name=""
            className="truncate text-sm font-medium text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]"
          >
            {station?.name ?? labels.choose}
          </span>
          {isLive && (
            <Badge data-streaming-live-badge="" color="red" size="sm" dot={playing && status === "playing"}>
              {labels.live}
            </Badge>
          )}
        </div>
        {nowPlaying && station && (
          <span
            data-streaming-now-playing=""
            className="truncate text-sm text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]"
          >
            {nowPlaying}
          </span>
        )}
        {!compact && station && (station.description || station.genre) && (
          <span className="truncate text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
            {[station.genre, station.description].filter(Boolean).join(" - ")}
          </span>
        )}
        {statusText && (
          <span
            data-streaming-status=""
            className="text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]"
          >
            {statusText}
          </span>
        )}
        {blocked && !playing && (
          <span
            data-streaming-hint=""
            className="text-xs text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]"
          >
            {labels.pressPlay}
          </span>
        )}
        {failureText && (
          <span data-streaming-error="" className="text-xs text-red-600 dark:text-red-400">
            {failureText}
          </span>
        )}
      </div>

      <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1")}>
        <Select
          id={`${base}-station`}
          data-streaming-control="station"
          size="sm"
          label={labels.station}
          labelHidden
          placeholder={labels.choose}
          list={stations.map((s) => ({ value: s.id, label: s.name }))}
          value={station ? station.id : ""}
          onValueChange={(next) => setValue({ stationId: next })}
          className={compact ? "max-w-40" : "max-w-56"}
        />

        <Button
          type="button"
          size="sm"
          data-streaming-control="play"
          aria-label={playing ? labels.pause : labels.play}
          icon={playing ? "pause" : "play"}
          disabled={!station}
          onClick={() => requestPlaying(!playing)}
          className={CONTROL_OUTLINE}
        >
          {compact ? undefined : playing ? labels.pause : labels.play}
        </Button>

        <Button
          type="button"
          size="sm"
          data-streaming-control="mute"
          aria-label={labels.mute}
          aria-pressed={value.muted}
          icon={value.muted ? "volume-x" : "volume-2"}
          onClick={() => setValue({ muted: !value.muted })}
          className={CONTROL_OUTLINE}
        />

        <div data-streaming-control="volume" className={compact ? "w-20" : "w-28"}>
          <Slider
            id={`${base}-volume`}
            size="sm"
            label={labels.volume}
            labelHidden
            min={0}
            max={100}
            step={1}
            value={volumePct}
            onValueChange={(v) => setValue({ volume: v / 100 })}
          />
        </div>
      </div>

      {isFile && (
        <div className="flex w-full items-center gap-3">
          <div data-streaming-control="seek" className="flex-1">
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
                const audio = audioEl.current;
                if (audio) audio.currentTime = v;
                setTime((t) => ({ ...t, current: v }));
              }}
            />
          </div>
          <span
            data-streaming-time=""
            className="shrink-0 text-xs tabular-nums text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]"
          >
            {fillLabel(labels.time, { elapsed: formatTime(time.current), duration: formatTime(time.duration) })}
          </span>
        </div>
      )}

      <div
        aria-live="polite"
        data-streaming-live=""
        className="sr-only"
        style={visuallyHidden}
      >
        {announcement}
      </div>
    </div>
  );
});

StreamingAudio.displayName = "StreamingAudio";
