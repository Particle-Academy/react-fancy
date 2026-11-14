# Channels

A **channel** is one of three things:

- a **single track** (`kind: "track"`)
- a **playlist** of tracks (`kind: "playlist"`)
- a **live stream** from any service (`kind: "live"`)

The channel components build a full channel UI out of these:

| Component | What it is |
|---|---|
| [`ChannelPlayer`](./ChannelPlayer.md) | The player for all three kinds. Previous, play/pause, next, shuffle, repeat, mute, volume and seek, on `<audio>`, `<video>` or a provider embed |
| [`ChannelGuide`](./ChannelGuide.md) | The channel list, with each channel's kind, length or live status |
| [`Playlist`](./Playlist.md) | A channel's tracks. You can play any of them, reorder them, remove them and add new ones. Shuffle and repeat live here, and proposed edits wait in the list until someone accepts or rejects them |
| [`MediaQueue`](./MediaQueue.md) | Up next, in play order |
| [`TrackItem`](./TrackItem.md) | One track as a row |
| [`NowPlaying`](./NowPlaying.md) | What is on: artwork, title and artist, or a live channel's name, what is on air and its badge |
| [`LiveBadge`](./LiveBadge.md) | LIVE / Starting / Offline / Ended |
| [`MediaEmbed`](./MediaEmbed.md) | A provider's own player (YouTube, Vimeo, Twitch, or one you register). It loads only once someone plays it |

There is no runtime dependency. Every source the kit plays itself is native.

## One value drives everything

Every part is controlled through a single `ChannelPlayerValue`. Give the same
value to the player, the guide, the playlist and the queue, and they stay in
step. That one JSON object is the whole state of the UI, which is what lets an
agent read and drive it.

```ts
interface ChannelPlayerValue {
  channelId: string | null;
  trackId: string | null;   // null on a live channel
  playing: boolean;
  position: number;         // seconds; the player reports it, and moving it seeks
  volume: number;           // 0..1
  muted: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  order: string[] | null;   // the shuffled play order, or null
}
```

The moves are pure functions, exported beside the types. The components use
them, and so should a bridge or a server: `selectChannel`, `selectTrack`,
`nextTrack`, `previousTrack`, `trackEnded`, `toggleShuffle`, `cycleRepeat`,
`playOrder`, `upNext`, `moveTrack`, `addTrack`, `removeTrack`,
`applyQueueEdit`, `reconcileValue`, and `createChannelValue` for the initial
value.

```tsx
import { useState } from "react";
import {
  ChannelGuide,
  ChannelPlayer,
  MediaQueue,
  Playlist,
  createChannelValue,
  findChannel,
  type Channel,
} from "@particle-academy/react-fancy";

const initial: Channel[] = [
  { id: "single", name: "Make it Fancy", kind: "track",
    track: { id: "mif", title: "Make it Fancy", source: { type: "file", url: "/audio/make-it-fancy.mp3" } } },
  { id: "mix", name: "Morning mix", kind: "playlist", tracks: [
    { id: "t1", title: "First", artist: "The Band", source: { type: "file", url: "/audio/first.mp3" } },
    { id: "t2", title: "Second", artist: "The Band", source: { type: "file", url: "/audio/second.mp3" } },
  ] },
  { id: "radio", name: "Riverside Radio", kind: "live",
    source: { type: "stream", url: "https://ice.example.com/riverside" }, nowPlaying: "Morning show" },
];

export function Channels() {
  const [channels, setChannels] = useState(initial);
  const [value, setValue] = useState(() => createChannelValue({ volume: 0.8 }));
  const channel = findChannel(channels, value.channelId);

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <ChannelGuide channels={channels} value={value} onChange={setValue} />
      <div className="flex flex-col gap-4">
        <ChannelPlayer channels={channels} value={value} onChange={setValue} />
        {channel && channel.kind !== "live" && (
          <Playlist
            channel={channel}
            value={value}
            onChange={setValue}
            onTracksChange={(id, tracks) =>
              setChannels((all) => all.map((c) => (c.id === id && c.kind === "playlist" ? { ...c, tracks } : c)))
            }
          />
        )}
        <MediaQueue channel={channel} value={value} onChange={setValue} />
      </div>
    </div>
  );
}
```

## Sources: "any streaming service"

```ts
type ChannelSource =
  | { type: "file"; url: string; mime?: string; media?: "audio" | "video" }
  | { type: "stream"; url: string; protocol?: "icecast" | "hls" | "dash"; media?: "audio" | "video" }
  | { type: "embed"; provider: string; id: string; params?: Record<string, string> };
```

| Source | Plays |
|---|---|
| `file` (MP3, M4A, OGG, MP4, WebM...) | Everywhere, on `<audio>` / `<video>` |
| `stream`, Icecast / Shoutcast | Everywhere, on `<audio>` |
| `stream`, HLS (`.m3u8`) | Natively on Safari and iOS. Everywhere else once you import the opt-in hls.js adapter (below). Without it, the player says "This stream can't play in this browser" and reports `unsupported` |
| `stream`, DASH (`.mpd`) | Only through an adapter you register |
| `embed`: `youtube`, `vimeo`, `twitch` | In the provider's own iframe player |

A `url` must be `http(s)` or a same-origin relative path. Anything else is
refused, whatever an adapter says.

`protocol` and `media` default from the URL. `.m3u8` is HLS, `.mpd` is DASH
and anything else is Icecast. Icecast is audio, HLS and DASH are video, and a
file goes by its extension or `mime`.

### HLS everywhere: the opt-in hls.js adapter

react-fancy does not depend on an HLS library. To play HLS in Chrome, Firefox,
Edge and on Android, install hls.js (an optional peer, `^1.7.4`) and import
the adapter once, anywhere on the client:

```bash
npm install hls.js
```

```ts
import "@particle-academy/react-fancy/channels/hls";
```

That import registers the adapter, and every `ChannelPlayer` on the page then
plays HLS through hls.js wherever `Hls.isSupported()`. Where it is not, the
native HLS path (Safari, iOS) still plays it.

- **Nothing else imports it.** Neither the main entry nor any other subpath
  imports hls.js, so an app that never imports `./channels/hls` never installs,
  bundles or loads it. A test fails if that changes.
- **Errors.** hls.js recovers from non-fatal errors itself. A fatal media error
  gets one `recoverMediaError()`. Any other fatal error destroys the instance
  and fires the element's `error` event, so ChannelPlayer reconnects with its
  usual backoff, on a fresh instance.
- **Configuration and control.** `createHlsAdapter({ config })` builds an
  adapter with your `HlsConfig`. `unregisterHlsAdapter()` removes the default
  one, and `registerHlsAdapter()` puts it back. For example, for low-latency
  streams:

```ts
import { createHlsAdapter, unregisterHlsAdapter } from "@particle-academy/react-fancy/channels/hls";
import { registerMediaAdapter } from "@particle-academy/react-fancy";

unregisterHlsAdapter();
registerMediaAdapter(createHlsAdapter({ config: { lowLatencyMode: true } }));
```

The same seam takes any other library: DASH through dash.js, say. Write an
adapter with `registerMediaAdapter` (approve the library under your own
third-party policy first).

Adapters you register are asked first, before the native ones, and the last
one registered is asked first of all. `registerMediaAdapter` returns the
unregister function. `attach` must return a detach that stops all network
activity, because a live channel is detached on every pause.

### Embeds: built in, and your own

- **YouTube** uses `youtube-nocookie.com`, the privacy-enhanced host. The id
  must be the 11-character video id. Play and pause go through YouTube's
  postMessage API.
- **Vimeo** takes a numeric id. Play and pause go through Vimeo's postMessage
  API.
- **Twitch** takes a channel name. Twitch requires `parent=<your hostname>`,
  which is read in the browser. The player is not driven, because Twitch's
  control API needs Twitch's own script.

```ts
registerEmbedProvider({
  id: "owncast",
  title: "Owncast",
  embedUrl: (s) => (/^[a-z0-9-]+$/.test(s.id) ? `https://live.example.com/embed/video?stream=${s.id}` : null),
});
```

An embed URL must be `https:`. Until the embed is first played it is a poster
with a play button, so a page that shows one sends no request to the provider.

## Human+ and agents

- **Controlled state.** Everything is in `ChannelPlayerValue`. Playlist
  contents are your data and come back through `onTracksChange`.
- **Stable handles.** Every part carries a handle:
  - the player: `data-react-fancy-channel-player`, `data-channel-id`,
    `data-channel-kind`, `data-track-id`, `data-channel-playing`, and
    `data-channel-control="prev|play|next|shuffle|repeat|mute|volume|seek"`
  - the guide: `data-channel-guide-item=<id>`
  - the playlist: `data-playlist-track=<id>`, and
    `data-playlist-action="up|down|remove|add|shuffle|repeat|accept|reject"`
  - the queue: `data-queue-track=<id>`
- **Staged edits.** Pass a `Playlist` its `pendingEdits` (`remove`, `clear`,
  `replace`). Each one is shown in place, and nothing changes until a person
  presses Accept. This is how an agent's destructive queue edit should arrive.
- **Honest state.** When the browser blocks autoplay, or a stream gives up
  after three reconnects, the player sets `playing: false`. The value never
  claims to be playing when it is not.

A `registerMediaBridge` for agent-integrations is planned, not shipped.
