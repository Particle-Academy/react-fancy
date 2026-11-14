# Playlist

A [channel](./Channels.md)'s tracks:

- play any of them; selecting one tunes to this channel if the value is on
  another
- turn shuffle on or off, and cycle repeat (off, all, one)
- with `onTracksChange`: **Move up / Move down** (buttons, so the keyboard can
  reorder), **remove**, and **add** from a `library`
- **proposed edits**, from an agent or a collaborator: each waits in place
  with Accept / Reject, and nothing changes until it is accepted

Given a track channel, it shows that one track, read-only.

## Import

```tsx
import { Playlist } from "@particle-academy/react-fancy";
import { Playlist } from "@particle-academy/react-fancy/playlist";
```

## Usage

```tsx
<Playlist
  channel={channel}
  value={value}
  onChange={setValue}
  onTracksChange={(channelId, tracks) => saveTracks(channelId, tracks)}
  library={allTracks}
  pendingEdits={proposals}
  onResolvePending={(id, accepted) => dropProposal(id)}
/>
```

The tracks are your data. An edit comes back through `onTracksChange`, and the
shared value is kept in step through `onChange`:

- if the current track was removed, the next one takes its place
- a held shuffle order drops removed tracks and appends added ones
- an emptied playlist stops

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `channel` | `Channel` | | A playlist (editable) or a track channel |
| `value` / `onChange` | | | The shared value |
| `onTracksChange` | `(channelId, tracks) => void` | | Turns on reorder, remove and add |
| `library` | `MediaTrack[]` | | Tracks that can be added. Those already in the list are not offered |
| `pendingEdits` | `PendingQueueEdit[]` | `[]` | `{ op: "remove", trackId }`, `{ op: "clear" }`, `{ op: "replace", tracks }` |
| `onResolvePending` | `(editId, accepted) => void` | | Accept applies the edit through `onTracksChange` first |
| `hideModes` | `boolean` | `false` | Hide shuffle / repeat |
| `labels` | `Partial<PlaylistLabels>` | English | Every visible string |
| `trackLabels` | `Partial<TrackItemLabels>` | | |

## Handles

`data-react-fancy-playlist` and `data-channel-id` on the root.
`data-playlist-track=<id>` on each row, plus `data-playlist-pending="remove"`
while a removal is proposed. `data-playlist-pending-banner` for a proposed
clear or replace. `data-playlist-action="up|down|remove|add|shuffle|repeat|accept|reject"`
on the buttons.
