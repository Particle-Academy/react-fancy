# ChannelGuide

The channel list. Each [channel](./Channels.md) is shown with its artwork (or
an icon for its kind) and name. Under the name it shows "Single", "Playlist, N
tracks", or a [`LiveBadge`](./LiveBadge.md) with what is on air.

Selecting a channel runs `selectChannel` on the shared value, which tunes to
its first track from the start and keeps `playing` as it was. `aria-current`
marks the channel that is on.

## Import

```tsx
import { ChannelGuide } from "@particle-academy/react-fancy";
import { ChannelGuide } from "@particle-academy/react-fancy/channel-guide";
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `channels` | `Channel[]` | | |
| `value` | `ChannelPlayerValue` | | The shared value |
| `onChange` | `(next) => void` | | |
| `layout` | `"list" \| "grid"` | `"list"` | `"grid"` shows cards |
| `labels` | `Partial<ChannelGuideLabels>` | English | `guide`, `single`, `playlist` / `playlistOne` (slot `{count}`), `live` |
| `liveLabels` | `Partial<LiveBadgeLabels>` | | |

## Handles

`data-react-fancy-channel-guide`, and on each item
`data-channel-guide-item=<id>` and `data-channel-kind`.
