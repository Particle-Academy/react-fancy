# ChannelPlayer

The one player for every [channel](./Channels.md) kind:

- **a single track**, with play/pause, repeat, seek, mute and volume
- **a playlist**, which adds previous / next and shuffle, and moves on when a
  track ends
- **a live stream**, with a LIVE badge and what is on air. There is no seek;
  the connection is dropped on pause and reopened at the live edge, and a
  dropped stream is retried three times (1s, 2s, 4s) before it is reported as
  failed

It plays on `<video>` when the source has picture, on `<audio>` when it does
not, and in a [`MediaEmbed`](./MediaEmbed.md) for a provider embed.

For one file with the browser's own controls use `AudioViewer` / `VideoViewer`.
For a station picker over Icecast mounts, `StreamingAudio` still fits.

## Import

```tsx
import { ChannelPlayer } from "@particle-academy/react-fancy";
// or the subpath, which also exports the model helpers and the source registries
import { ChannelPlayer, createChannelValue } from "@particle-academy/react-fancy/channel-player";
```

## Usage

```tsx
const [value, setValue] = useState(() => selectChannel(createChannelValue(), channels[0]));

<ChannelPlayer channels={channels} value={value} onChange={setValue} onError={(id, kind) => log(id, kind)} />;
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `channels` | `Channel[]` | | Every channel the value may point at |
| `value` | `ChannelPlayerValue` | | Controlled. Nothing plays until `value.playing` is true |
| `onChange` | `(next) => void` | | Every move, and whole-second progress in `position` |
| `onError` | `(channelId, kind) => void` | | `kind` is one of:<br>`"refused"`: the src is not http(s)<br>`"unsupported"`: nothing here can play it<br>`"failed"`: the file errored, or reconnects ran out<br>`"blocked"`: the browser blocked autoplay |
| `labels` | `Partial<ChannelPlayerLabels>` | English | Every visible string |
| `liveLabels` | `Partial<LiveBadgeLabels>` | | Passed to the badge |
| `embedLabels` | `Partial<MediaEmbedLabels>` | | Passed to the embed |
| `mediaRef` | `Ref<HTMLMediaElement>` | | The underlying element |

## Controlled position

The player reports `value.position` once a second, in whole seconds. Setting
`value.position` more than 1.5 seconds away from where the element is seeks.
That is how a host, or an agent, seeks.

## Behaviour you can rely on

- `playing: false` comes back through `onChange` when autoplay is blocked,
  when a stream gives up, when a src is refused, and when nothing can play the
  source.
- Track and channel changes are announced in a polite live region
  ("Now on {channel}", "Now playing {title}").
- The Media Session gets the title, artist, artwork, play, pause, next track
  and previous track.

## Handles

`data-react-fancy-channel-player`, `data-channel-id`, `data-channel-kind`,
`data-track-id`, `data-channel-playing`, `data-channel-media="audio|video"` on
the element, and `data-channel-control="prev|play|next|shuffle|repeat|mute|volume|seek"`.
