import { forwardRef, useState } from "react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import {
  addTrack,
  applyQueueEdit,
  channelTracks,
  cycleRepeat,
  moveTrack,
  reconcileValue,
  removeTrack,
  selectChannel,
  selectTrack,
  toggleShuffle,
} from "../../utils/media-channel";
import { Button } from "../Button/Button";
import { Select } from "../inputs/Select/Select";
import { TrackItem } from "../TrackItem/TrackItem";
import { useId } from "../../hooks/use-id";
import { ACTIVE_ROW, CONTROL_OUTLINE, SURFACE, TEXT, TEXT_MUTED } from "../ChannelPlayer/media-classes";
import type { Channel, MediaTrack, PendingQueueEdit, RepeatMode } from "../../utils/media-channel";
import type { PlaylistLabels, PlaylistProps } from "./Playlist.types";

const DEFAULT_LABELS: PlaylistLabels = {
  list: "{channel} tracks",
  count: "{count} tracks",
  countOne: "{count} track",
  shuffle: "Shuffle",
  repeatOff: "Repeat: off",
  repeatAll: "Repeat: all",
  repeatOne: "Repeat: one",
  moveUp: "Move {title} up",
  moveDown: "Move {title} down",
  remove: "Remove {title}",
  library: "Add a track",
  chooseTrack: "Choose a track",
  add: "Add",
  pendingRemove: "Removal proposed",
  pendingClear: "Proposed: clear the playlist",
  pendingReplace: "Proposed: replace the playlist with {count} tracks",
  accept: "Accept",
  reject: "Reject",
  empty: "No tracks yet",
};

const REPEAT_ICON: Record<RepeatMode, string> = { off: "repeat", all: "repeat", one: "repeat-1" };

/**
 * A channel's tracks: play any of them, and, with `onTracksChange`, reorder
 * (Move up / Move down), remove and add from a library. Shuffle and repeat are
 * the shared value's. Proposed edits wait in place for Accept / Reject.
 */
export const Playlist = forwardRef<HTMLDivElement, PlaylistProps>(function Playlist(
  {
    channel,
    value,
    onChange,
    onTracksChange,
    library,
    pendingEdits = [],
    onResolvePending,
    hideModes = false,
    labels: labelsProp,
    trackLabels,
    className,
    ...rest
  },
  ref,
) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const base = useId("playlist");
  const [toAdd, setToAdd] = useState("");
  const tracks = channelTracks(channel);
  const isPlaylist = channel.kind === "playlist";
  const editable = isPlaylist && onTracksChange !== undefined;
  const onThis = value.channelId === channel.id;
  const tuned = onThis ? value : selectChannel(value, channel);

  const commit = (next: MediaTrack[]) => {
    if (!onTracksChange || !isPlaylist) return;
    onTracksChange(channel.id, next);
    const reconciled = reconcileValue(value, { ...channel, tracks: next } as Channel, channel);
    if (reconciled !== value) onChange(reconciled);
  };

  const resolve = (edit: PendingQueueEdit, accepted: boolean) => {
    if (accepted) commit(applyQueueEdit(tracks, edit));
    onResolvePending?.(edit.id, accepted);
  };

  const removals = new Map(
    pendingEdits.filter((e): e is Extract<PendingQueueEdit, { op: "remove" }> => e.op === "remove").map((e) => [e.trackId, e]),
  );
  const banners = pendingEdits.filter((e) => e.op !== "remove");
  const addable = (library ?? []).filter((t) => !tracks.some((x) => x.id === t.id));
  const repeatLabel = value.repeat === "one" ? labels.repeatOne : value.repeat === "all" ? labels.repeatAll : labels.repeatOff;
  const countText = fillLabel(tracks.length === 1 ? labels.countOne : labels.count, { count: tracks.length });

  const iconButton = (action: string, icon: string, label: string, onClick: () => void, disabled = false) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      icon={icon}
      data-playlist-action={action}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    />
  );

  return (
    <div
      ref={ref}
      data-react-fancy-playlist=""
      data-channel-id={channel.id}
      className={cn("flex flex-col gap-2 rounded-lg border p-2", SURFACE, className)}
      {...rest}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 flex-col">
          <span className={cn("truncate text-sm font-semibold", TEXT)}>{channel.name}</span>
          <span className={cn("text-xs", TEXT_MUTED)}>{countText}</span>
        </div>
        {!hideModes && (
          <div className="flex items-center gap-1">
            {isPlaylist && (
              <Button
                type="button"
                size="sm"
                icon="shuffle"
                data-playlist-action="shuffle"
                aria-label={labels.shuffle}
                aria-pressed={value.shuffle}
                active={onThis && value.shuffle}
                onClick={() => onChange(toggleShuffle(tuned, channel))}
                className={CONTROL_OUTLINE}
              />
            )}
            {isPlaylist && (
              <Button
                type="button"
                size="sm"
                icon={REPEAT_ICON[value.repeat]}
                data-playlist-action="repeat"
                data-repeat={value.repeat}
                aria-label={repeatLabel}
                active={value.repeat !== "off"}
                onClick={() => onChange(cycleRepeat(tuned))}
                className={CONTROL_OUTLINE}
              />
            )}
          </div>
        )}
      </div>

      {banners.map((edit) => (
        <div
          key={edit.id}
          role="status"
          data-playlist-pending-banner=""
          data-playlist-pending={edit.op}
          data-pending-id={edit.id}
          className={cn("flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm", ACTIVE_ROW, TEXT)}
        >
          <span>
            {edit.op === "clear" ? labels.pendingClear : fillLabel(labels.pendingReplace, { count: edit.op === "replace" ? edit.tracks.length : 0 })}
          </span>
          <span className="flex items-center gap-1">
            <Button type="button" size="sm" icon="check" data-playlist-action="accept" onClick={() => resolve(edit, true)} className={CONTROL_OUTLINE}>
              {labels.accept}
            </Button>
            <Button type="button" size="sm" variant="ghost" icon="x" data-playlist-action="reject" onClick={() => resolve(edit, false)}>
              {labels.reject}
            </Button>
          </span>
        </div>
      ))}

      {tracks.length === 0 ? (
        <p data-playlist-empty="" className={cn("px-2 py-3 text-sm", TEXT_MUTED)}>
          {labels.empty}
        </p>
      ) : (
        <ol aria-label={fillLabel(labels.list, { channel: channel.name })} className="flex flex-col gap-0.5">
          {tracks.map((track, i) => {
            const active = onThis && value.trackId === track.id;
            const pending = removals.get(track.id);
            const actions = pending ? (
              <>
                <span className={cn("text-xs", TEXT_MUTED)}>{labels.pendingRemove}</span>
                <Button type="button" size="sm" icon="check" data-playlist-action="accept" onClick={() => resolve(pending, true)} className={CONTROL_OUTLINE}>
                  {labels.accept}
                </Button>
                <Button type="button" size="sm" variant="ghost" icon="x" data-playlist-action="reject" onClick={() => resolve(pending, false)}>
                  {labels.reject}
                </Button>
              </>
            ) : editable ? (
              <>
                {iconButton("up", "arrow-up", fillLabel(labels.moveUp, { title: track.title }), () => commit(moveTrack(tracks, track.id, i - 1)), i === 0)}
                {iconButton(
                  "down",
                  "arrow-down",
                  fillLabel(labels.moveDown, { title: track.title }),
                  () => commit(moveTrack(tracks, track.id, i + 1)),
                  i === tracks.length - 1,
                )}
                {iconButton("remove", "x", fillLabel(labels.remove, { title: track.title }), () => commit(removeTrack(tracks, track.id)))}
              </>
            ) : undefined;
            return (
              <li
                key={track.id}
                data-playlist-track={track.id}
                data-playlist-pending={pending ? "remove" : undefined}
                aria-current={active ? "true" : undefined}
                className={cn("rounded-md", active && ACTIVE_ROW, pending && "opacity-70")}
              >
                <TrackItem
                  track={track}
                  index={i + 1}
                  active={active}
                  playing={active && value.playing}
                  onSelect={(id) => onChange(selectTrack(tuned, id))}
                  actions={actions}
                  labels={trackLabels}
                />
              </li>
            );
          })}
        </ol>
      )}

      {editable && addable.length > 0 && (
        <div data-playlist-library="" className="flex items-center gap-2 px-1">
          <Select
            id={`${base}-library`}
            size="sm"
            label={labels.library}
            labelHidden
            placeholder={labels.chooseTrack}
            list={addable.map((t) => ({ value: t.id, label: t.artist ? `${t.title} - ${t.artist}` : t.title }))}
            value={toAdd}
            onValueChange={setToAdd}
            className="max-w-64"
          />
          <Button
            type="button"
            size="sm"
            icon="plus"
            data-playlist-action="add"
            disabled={!addable.some((t) => t.id === toAdd)}
            onClick={() => {
              const track = addable.find((t) => t.id === toAdd);
              if (!track) return;
              commit(addTrack(tracks, track) as MediaTrack[]);
              setToAdd("");
            }}
            className={CONTROL_OUTLINE}
          >
            {labels.add}
          </Button>
        </div>
      )}
    </div>
  );
});

Playlist.displayName = "Playlist";
