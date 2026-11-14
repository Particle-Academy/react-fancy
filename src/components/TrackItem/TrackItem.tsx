import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import { formatMediaTime } from "../../utils/format-media-time";
import { visuallyHidden } from "../../utils/visually-hidden";
import { Icon } from "../Icon/Icon";
import { FOCUS_RING, TEXT, TEXT_MUTED, TEXT_SOFT } from "../ChannelPlayer/media-classes";
import type { TrackItemLabels, TrackItemProps } from "./TrackItem.types";

const DEFAULT_LABELS: TrackItemLabels = {
  nowPlaying: "Now playing",
  play: "Play {title}",
};

/** One track as a row: artwork, title, artist, duration, a now-playing mark and optional actions. */
export const TrackItem = forwardRef<HTMLDivElement, TrackItemProps>(function TrackItem(
  { track, index, active = false, playing = false, onSelect, actions, labels: labelsProp, className, ...rest },
  ref,
) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const body = (
    <>
      {track.artwork && <img src={track.artwork} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />}
      <span className="flex min-w-0 flex-col text-start">
        <span className={cn("truncate text-sm", active ? "font-semibold" : "font-medium", TEXT)}>{track.title}</span>
        {track.artist && <span className={cn("truncate text-xs", TEXT_MUTED)}>{track.artist}</span>}
      </span>
    </>
  );

  return (
    <div
      ref={ref}
      data-react-fancy-track-item=""
      data-track-id={track.id}
      data-active={active ? "true" : "false"}
      className={cn("flex min-w-0 items-center gap-3 px-2 py-1.5", className)}
      {...rest}
    >
      {index != null && (
        <span aria-hidden="true" className={cn("w-5 shrink-0 text-end text-xs tabular-nums", TEXT_MUTED)}>
          {active && playing ? <Icon name="audio-lines" size="xs" /> : index}
        </span>
      )}
      {onSelect ? (
        <button
          type="button"
          data-track-select=""
          aria-label={fillLabel(labels.play, { title: track.title, artist: track.artist ?? "" })}
          onClick={() => onSelect(track.id)}
          className={cn("flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded", FOCUS_RING)}
        >
          {body}
        </button>
      ) : (
        <span data-track-select="" className="flex min-w-0 flex-1 items-center gap-3">
          {body}
        </span>
      )}
      {active && playing && (
        <span data-track-now-playing="" className="sr-only" style={visuallyHidden}>
          {labels.nowPlaying}
        </span>
      )}
      {track.duration != null && (
        <span data-track-duration="" className={cn("shrink-0 text-xs tabular-nums", TEXT_SOFT)}>
          {formatMediaTime(track.duration)}
        </span>
      )}
      {actions && <span className="flex shrink-0 items-center gap-1">{actions}</span>}
    </div>
  );
});

TrackItem.displayName = "TrackItem";
