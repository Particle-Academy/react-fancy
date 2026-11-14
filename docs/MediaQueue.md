# MediaQueue

"Up next": the tracks after the current one, in play order. It follows the
shuffle order, and with repeat all it wraps round. Selecting a queued track
jumps to it. Without `onChange` the queue is read-only.

## Import

```tsx
import { MediaQueue } from "@particle-academy/react-fancy";
import { MediaQueue } from "@particle-academy/react-fancy/media-queue";
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `channel` | `Channel \| undefined` | | Usually `findChannel(channels, value.channelId)` |
| `value` | `ChannelPlayerValue` | | The shared value |
| `onChange` | `(next) => void` | | Jump to a queued track |
| `limit` | `number` | `5` | |
| `labels` | `Partial<MediaQueueLabels>` | English | `heading`, `empty` |

## Handles

`data-react-fancy-media-queue`, `data-queue-track=<id>`, `data-queue-empty`.
