import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { LiveBadge } from "../LiveBadge/LiveBadge";
import { TEXT, TEXT_MUTED, TEXT_SOFT } from "../ChannelPlayer/media-classes";
import type { NowPlayingLabels, NowPlayingProps } from "./NowPlaying.types";

const DEFAULT_LABELS: NowPlayingLabels = { nothing: "Nothing playing" };

/**
 * What is on: the track's artwork, title and artist under its channel's name,
 * or, on a live channel, the channel, what is on air and its live status.
 */
export const NowPlaying = forwardRef<HTMLDivElement, NowPlayingProps>(function NowPlaying(
  { channel, track, size = "md", labels: labelsProp, liveLabels, className, ...rest },
  ref,
) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const live = channel?.kind === "live" ? channel : undefined;
  const artwork = track?.artwork ?? channel?.artwork;
  const title = live ? live.name : (track?.title ?? channel?.name ?? labels.nothing);
  const subtitle = live ? live.nowPlaying : track?.artist;
  const context = !live && channel && channel.kind === "playlist" ? channel.name : undefined;

  return (
    <div
      ref={ref}
      data-react-fancy-now-playing=""
      data-channel-id={channel?.id ?? ""}
      data-track-id={track?.id ?? ""}
      className={cn("flex min-w-0 items-center gap-3", className)}
      {...rest}
    >
      {artwork && (
        <img
          src={artwork}
          alt=""
          className={cn("shrink-0 rounded-md object-cover", size === "sm" ? "h-10 w-10" : "h-14 w-14")}
        />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span data-now-playing-title="" className={cn("truncate text-sm font-semibold", TEXT)}>
            {title}
          </span>
          {live && <LiveBadge status={live.status ?? "live"} labels={liveLabels} />}
        </div>
        {subtitle && <span className={cn("truncate text-sm", TEXT_SOFT)}>{subtitle}</span>}
        {context && <span className={cn("truncate text-xs", TEXT_MUTED)}>{context}</span>}
      </div>
    </div>
  );
});

NowPlaying.displayName = "NowPlaying";
