# VideoViewer

A standalone video viewer — native controls, optional poster, fit-to-box, and
dark-aware framing. Renders for video sources inside `MediaViewer`.

## Import

```tsx
import { VideoViewer } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<VideoViewer src="/clip.mp4" poster="/clip.jpg" style={{ height: 360 }} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | — | Video source (`http(s):` / `data:` / `blob:`) |
| poster | `string` | — | Poster image shown before playback |
| controls | `boolean` | `true` | Show native playback controls |
| autoPlay | `boolean` | `false` | Autoplay on mount (usually needs `muted`) |
| loop | `boolean` | `false` | Loop playback |
| muted | `boolean` | `false` | Start muted |
| fit | `"contain" \| "cover"` | `"contain"` | How the video fits its box |
| onError | `() => void` | — | Fired when the video fails to load |
| className | `string` | — | Classes for the container |
| style | `CSSProperties` | — | Styles for the container (e.g. a height) |
