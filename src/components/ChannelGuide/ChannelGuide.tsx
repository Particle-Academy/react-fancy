import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import { visuallyHidden } from "../../utils/visually-hidden";
import { selectChannel } from "../../utils/media-channel";
import { Icon } from "../Icon/Icon";
import { LiveBadge } from "../LiveBadge/LiveBadge";
import { ACTIVE_ROW, FOCUS_RING, HOVER_ROW, SURFACE, TEXT, TEXT_MUTED, TEXT_SOFT } from "../ChannelPlayer/media-classes";
import type { Channel } from "../../utils/media-channel";
import type { ChannelGuideLabels, ChannelGuideProps } from "./ChannelGuide.types";

const DEFAULT_LABELS: ChannelGuideLabels = {
  guide: "Channels",
  single: "Single",
  playlist: "Playlist, {count} tracks",
  playlistOne: "Playlist, {count} track",
  live: "Live",
};

const KIND_ICON: Record<Channel["kind"], string> = { track: "music", playlist: "list-music", live: "radio" };

/**
 * The channel list: every channel with its kind (a single, a playlist and its
 * length, or live with its status and what is on air). Selecting one tunes the
 * shared value to it; `aria-current` marks the channel that is on.
 */
export const ChannelGuide = forwardRef<HTMLUListElement, ChannelGuideProps>(function ChannelGuide(
  { channels, value, onChange, layout = "list", labels: labelsProp, liveLabels, className, ...rest },
  ref,
) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };

  return (
    <ul
      ref={ref}
      data-react-fancy-channel-guide=""
      data-layout={layout}
      aria-label={labels.guide}
      className={cn(layout === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3" : "flex flex-col gap-1", className)}
      {...rest}
    >
      {channels.map((channel) => {
        const active = value.channelId === channel.id;
        const kindText =
          channel.kind === "track"
            ? labels.single
            : channel.kind === "playlist"
              ? fillLabel(channel.tracks.length === 1 ? labels.playlistOne : labels.playlist, { count: channel.tracks.length })
              : null;
        const detail = channel.kind === "live" ? channel.nowPlaying : channel.description;
        return (
          <li key={channel.id} data-channel-guide-item={channel.id} data-channel-kind={channel.kind}>
            <button
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => onChange(selectChannel(value, channel))}
              className={cn(
                "flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg text-start",
                layout === "grid" ? cn("flex-col items-start border p-3", SURFACE) : "p-2",
                active ? ACTIVE_ROW : HOVER_ROW,
                FOCUS_RING,
              )}
            >
              {channel.artwork ? (
                <img
                  src={channel.artwork}
                  alt=""
                  className={cn("shrink-0 rounded-md object-cover", layout === "grid" ? "aspect-square w-full" : "h-11 w-11")}
                />
              ) : (
                <span aria-hidden="true" className={cn("flex h-11 w-11 shrink-0 items-center justify-center", TEXT_MUTED)}>
                  <Icon name={KIND_ICON[channel.kind]} size="sm" />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn("truncate text-sm", active ? "font-semibold" : "font-medium", TEXT)}>{channel.name}</span>
                <span className={cn("flex min-w-0 items-center gap-2 text-xs", TEXT_MUTED)}>
                  {kindText ?? (
                    <>
                      <span className="sr-only" style={visuallyHidden}>
                        {labels.live}
                      </span>
                      <LiveBadge status={channel.kind === "live" ? (channel.status ?? "live") : "live"} labels={liveLabels} />
                    </>
                  )}
                </span>
                {detail && <span className={cn("truncate text-xs", TEXT_SOFT)}>{detail}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
});

ChannelGuide.displayName = "ChannelGuide";
