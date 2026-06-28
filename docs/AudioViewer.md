# AudioViewer

A standalone audio viewer — a themed card wrapping the native audio player, with
an optional title. Renders for audio sources inside `MediaViewer`.

## Import

```tsx
import { AudioViewer } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<AudioViewer src="/track.mp3" title="track.mp3" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | — | Audio source (`http(s):` / `data:` / `blob:`) |
| title | `string` | — | Label shown above the player (e.g. the file name) |
| controls | `boolean` | `true` | Show native playback controls |
| autoPlay | `boolean` | `false` | Autoplay on mount |
| loop | `boolean` | `false` | Loop playback |
| onError | `() => void` | — | Fired when the audio fails to load |
| className | `string` | — | Classes for the card |
| style | `CSSProperties` | — | Styles for the card |
