# StreamingAudio

A player for server-hosted MP3s and Icecast / Shoutcast live streams, built on the native `<audio>` element only: no HLS, no media library, no dependency. A station picker, play / pause, volume and mute, the station name, what is on air, and a LIVE badge. Files also get elapsed / duration and a seek bar.

It is fully controlled through `value` / `onChange`. Nothing plays until `value.playing` is true, and the component reports back (`playing: false`) when the browser blocks autoplay or a stream gives up, so the value never claims to be playing when it is not.

For a single file with the browser's own controls, use `AudioViewer`.

## Import

```tsx
import { StreamingAudio } from "@particle-academy/react-fancy";
// or the subpath
import { StreamingAudio } from "@particle-academy/react-fancy/streaming-audio";
```

## Basic Usage

```tsx
import { useState } from "react";
import { StreamingAudio, type StreamingAudioValue } from "@particle-academy/react-fancy";

const stations = [
  { id: "jazz", name: "Jazz FM", src: "https://ice.example.com/jazz", genre: "Jazz" },
  { id: "ep1", name: "Episode 1", src: "/media/episode-1.mp3", description: "Pilot" },
];

function Radio({ nowPlaying }: { nowPlaying?: string }) {
  const [value, setValue] = useState<StreamingAudioValue>({
    stationId: "jazz",
    playing: false,
    volume: 0.8,
    muted: false,
  });

  return (
    <StreamingAudio
      stations={stations}
      value={value}
      onChange={setValue}
      nowPlaying={nowPlaying}
      onError={(stationId, kind) => console.warn(stationId, kind)}
    />
  );
}
```

## Live streams and files

Each station is `"live"` or `"file"`. Without `kind`, it is guessed from `src`: a path ending in an audio file extension (`.mp3`, `.m4a`, `.m4b`, `.aac`, `.ogg`, `.oga`, `.opus`, `.wav`, `.flac`, `.weba`; query and fragment ignored) is a file, anything else is live. Many Icecast mounts are named like files (`/stream.mp3`); give those `kind: "live"`. The guess is exported as `guessStationKind(src)`.

**Live:**

- No seek bar and no time display.
- Pause drops the connection: the element is paused, its `src` removed and `load()` called, which is what actually stops the download.
- Play reconnects from the live edge, so you never hear a stale buffer from when you paused.
- On an `error` or `stalled` event while playing, it reconnects with backoff (1s, 2s, 4s; three attempts). A stall that recovers by itself (playback carries on) cancels its pending retry, and a successful reconnect resets the budget. After a fourth failure it stops, shows `labels.failed`, announces it, calls `onError(stationId, "failed")` and `onChange({ ...value, playing: false })`.

**File:**

- Elapsed / duration and a seek bar. Pause keeps the position.
- A file `error` is a failure straight away (no retries).

Switching stations while playing keeps playing on the new station.

## Allowed addresses

Only absolute `http:` / `https:` URLs and same-origin relative paths (`/media/a.mp3`, `media/a.mp3`) are handed to the element. Anything else (`javascript:`, `data:`, `blob:`, `file:`, protocol-relative `//host/...`, and any address with a backslash or a control character) is refused: the element never receives it, the station shows `labels.refused`, `onError(stationId, "refused")` fires once, and play does nothing. The check is exported as `isPlayableSrc(src)`.

## Autoplay

Browsers reject `play()` without a user gesture (`NotAllowedError`). When that happens the component calls `onChange({ ...value, playing: false })` once, shows "Press play to listen", and calls `onError(stationId, "blocked")`. It never retries on its own: a parent that ignores the change keeps `playing: true`, and nothing calls `play()` again until the value changes.

## Now playing (ICY metadata)

Browsers cannot read Icecast / Shoutcast ICY metadata from an `<audio>` element, so the component cannot know what is on air. The host supplies it as `nowPlaying`, typically by polling the stream server from the backend (Icecast's `/status-json.xsl`, Shoutcast's `/currentsong` or `/stats`) and pushing it to the page.

## Media Session

When `navigator.mediaSession` exists, the component publishes metadata (title: `nowPlaying`, or the station name when there is none; artist: the station name; artwork: `station.artwork`), keeps `playbackState` in step with `value.playing`, and registers `play` / `pause` action handlers that go through `onChange` like the buttons. They are removed on unmount. When the API is missing nothing happens. Nothing touches `window` or `navigator` during render, so the component renders on the server, and the server markup carries no `src`.

## Agents and handles

| Handle | Element |
|--------|---------|
| `data-react-fancy-streaming-audio` | Root. Also carries `data-streaming-station` (the selected id), `data-streaming-kind`, `data-streaming-playing`, `data-layout` |
| `data-streaming-control="station"` | The station `<select>` (react-fancy `Select`) |
| `data-streaming-control="play"` | Play / pause button |
| `data-streaming-control="mute"` | Mute toggle (`aria-pressed`) |
| `data-streaming-control="volume"` | Wrapper around the volume range input: `[data-streaming-control="volume"] input` |
| `data-streaming-control="seek"` | Wrapper around the seek range input (files only) |
| `data-streaming-live` | Polite live region: station changes and errors |
| `data-streaming-error`, `data-streaming-hint`, `data-streaming-status` | Error, autoplay hint, connecting / reconnecting |

An agent drives the player by writing `value`, never by clicking: set `stationId`, `playing`, `volume` or `muted` and the element follows.

## Accessibility

Every control is a native button, select or range input, so the player works from the keyboard alone. Each has an accessible name from `labels` (the select and sliders through visually hidden labels). The root is a region named by `labels.player`. Control outlines read the strong border token (`--fancy-border-strong`), per 6.15.0.

## Props

Also accepts every `<div>` attribute (`style`, `aria-*`, `data-*`, ...), forwarded to the root. `ref` is the root `<div>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| stations | `StreamingStation[]` | - | The stations |
| value | `{ stationId: string \| null; playing: boolean; volume: number; muted: boolean }` | - | Controlled state. `volume` is 0..1 |
| onChange | `(next: StreamingAudioValue) => void` | - | Every control, Media Session action, autoplay block and give-up |
| nowPlaying | `string` | - | What is on air, supplied by the host |
| onError | `(stationId: string, kind: "refused" \| "failed" \| "blocked") => void` | - | See above |
| labels | `Partial<StreamingAudioLabels>` | English | Every visible string (see below) |
| layout | `"bar" \| "compact"` | `"bar"` | `compact` drops artwork, description and button text |
| audioRef | `Ref<HTMLAudioElement>` | - | The underlying `<audio>` element |
| id | `string` | generated | Root id; control ids derive from it |
| className | `string` | - | Classes on the root |

## StreamingStation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | `string` | yes | Stable identity |
| name | `string` | yes | Display name and Media Session artist |
| src | `string` | yes | `http(s)` URL or same-origin relative path |
| kind | `"live" \| "file"` | no | Guessed from `src` when omitted |
| description | `string` | no | Shown in the `bar` layout |
| artwork | `string` | no | Image URL, shown in `bar` and given to the Media Session |
| genre | `string` | no | Shown in the `bar` layout |

## Labels

| Key | Default |
|-----|---------|
| player | `Audio player` |
| station | `Station` |
| choose | `Choose a station` |
| play | `Play` |
| pause | `Pause` |
| mute | `Mute` |
| volume | `Volume` |
| seek | `Seek` |
| live | `LIVE` |
| time | `{elapsed} / {duration}` |
| pressPlay | `Press play to listen` |
| connecting | `Connecting...` |
| reconnecting | `Reconnecting...` |
| refused | `{station} can't be played from this address.` |
| failed | `Couldn't connect to {station}.` |
| tuned | `Station: {station}` (announced on a station change) |
