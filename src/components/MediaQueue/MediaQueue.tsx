import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { useId } from "../../hooks/use-id";
import { selectTrack, upNext } from "../../utils/media-channel";
import { TrackItem } from "../TrackItem/TrackItem";
import { TEXT, TEXT_MUTED } from "../ChannelPlayer/media-classes";
import type { MediaQueueLabels, MediaQueueProps } from "./MediaQueue.types";

const DEFAULT_LABELS: MediaQueueLabels = { heading: "Up next", empty: "Nothing up next" };

/** What plays after the current track, in play order: shuffle and repeat all are followed. */
export const MediaQueue = forwardRef<HTMLDivElement, MediaQueueProps>(function MediaQueue(
  { channel, value, onChange, limit = 5, labels: labelsProp, trackLabels, className, ...rest },
  ref,
) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const headingId = useId("media-queue");
  const queued = value.channelId === channel?.id ? upNext(channel, value).slice(0, Math.max(0, limit)) : [];

  return (
    <div ref={ref} data-react-fancy-media-queue="" className={cn("flex flex-col gap-1", className)} {...rest}>
      <span id={headingId} className={cn("px-2 text-xs font-semibold uppercase tracking-wide", TEXT)}>
        {labels.heading}
      </span>
      {queued.length === 0 ? (
        <p data-queue-empty="" className={cn("px-2 text-sm", TEXT_MUTED)}>
          {labels.empty}
        </p>
      ) : (
        <ol aria-labelledby={headingId} className="flex flex-col gap-0.5">
          {queued.map((track) => (
            <li key={track.id} data-queue-track={track.id}>
              <TrackItem
                track={track}
                onSelect={onChange ? (id) => onChange(selectTrack(value, id)) : undefined}
                labels={trackLabels}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
});

MediaQueue.displayName = "MediaQueue";
