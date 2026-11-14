# TrackItem

One track as a row: position, artwork, title, artist, duration, a now-playing
mark, and room for actions. [`Playlist`](./Playlist.md) and
[`MediaQueue`](./MediaQueue.md) are built from it.

## Import

```tsx
import { TrackItem } from "@particle-academy/react-fancy";
import { TrackItem } from "@particle-academy/react-fancy/track-item";
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `track` | `MediaTrack` | | |
| `index` | `number` | | 1-based position, shown before the title |
| `active` | `boolean` | `false` | The current track |
| `playing` | `boolean` | `false` | The current track is playing. Shows the mark and reads "Now playing" |
| `onSelect` | `(trackId) => void` | | Makes the title a button, named "Play {title}" |
| `actions` | `ReactNode` | | Controls at the end of the row |
| `labels` | `Partial<TrackItemLabels>` | English | `nowPlaying`, `play` (slots `{title}`, `{artist}`) |

## Handles

`data-react-fancy-track-item`, `data-track-id`, `data-active`,
`data-track-select`, `data-track-duration`, `data-track-now-playing`.
