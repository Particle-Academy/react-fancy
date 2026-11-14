# NowPlaying

What is on. For a track, it shows the artwork, title and artist, plus the
playlist's name when the track is in one. For a live channel, it shows the
channel's name, what is on air and its [`LiveBadge`](./LiveBadge.md).
[`ChannelPlayer`](./ChannelPlayer.md) uses it; use it alone for a mini player
or a header.

## Import

```tsx
import { NowPlaying } from "@particle-academy/react-fancy";
import { NowPlaying } from "@particle-academy/react-fancy/now-playing";
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `channel` | `Channel` | | |
| `track` | `MediaTrack` | | Usually `currentTrack(channel, value)` |
| `size` | `"sm" \| "md"` | `"md"` | Artwork 40px or 56px |
| `labels` | `Partial<NowPlayingLabels>` | English | `nothing` |
| `liveLabels` | `Partial<LiveBadgeLabels>` | | |

## Handles

`data-react-fancy-now-playing`, `data-channel-id`, `data-track-id`.
