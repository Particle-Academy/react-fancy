# MediaViewer

Renders the right viewer for a media file — image, video, audio, or PDF — picked
from its MIME type (preferred) or its source URL, with a download fallback for
anything else. The single entry point for showing a file from a tree/workspace
when you don't know its type ahead of time. SVG renders through `ImageViewer`.

## Import

```tsx
import { MediaViewer } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<MediaViewer src={url} mime="image/png" alt="logo.png" style={{ height: 320 }} />
```

`mime` is preferred for picking the viewer. When omitted, the kind is sniffed
from `src` — a file extension, or the type embedded in a `data:` URI. Always
pass `mime` alongside a bare `blob:` URL, which carries no type of its own.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | — | Media source (`http(s):` / `data:` / `blob:`) |
| mime | `string` | — | MIME type — preferred for picking the viewer |
| alt | `string` | — | Alt text / label (image alt, audio + PDF title) |
| kind | `"image" \| "video" \| "audio" \| "pdf" \| "unknown"` | — | Force a viewer, bypassing detection |
| imageProps | `Partial<ImageViewerProps>` | — | Extra props for the underlying `ImageViewer` |
| videoProps | `Partial<VideoViewerProps>` | — | Extra props for the underlying `VideoViewer` |
| audioProps | `Partial<AudioViewerProps>` | — | Extra props for the underlying `AudioViewer` |
| pdfProps | `Partial<PdfViewerProps>` | — | Extra props for the underlying `PdfViewer` |
| fallback | `ReactNode` | download card | Rendered for unknown / unpreviewable types |
| onError | `() => void` | — | Fired when the chosen viewer reports a load error |
| className | `string` | — | Forwarded to the chosen viewer |
| style | `CSSProperties` | — | Forwarded to the chosen viewer |

## `resolveMediaType()`

The same detection logic, exported standalone so callers can branch their own
chrome (tabs, save buttons, …) — this is how `@particle-academy/fancy-code`'s
`FileViewer` decides text-vs-media.

```tsx
import { resolveMediaType, type MediaKind } from "@particle-academy/react-fancy";

resolveMediaType({ mime: "image/png" });            // "image"
resolveMediaType({ src: "/clip.webm" });            // "video"
resolveMediaType({ src: "data:application/pdf,…" });// "pdf"
resolveMediaType({ src: "main.ts" });               // "unknown" → treat as text
```

MIME wins when conclusive; otherwise `src` is sniffed (a `data:` URI's embedded
type first, then the file extension). Returns `"unknown"` when nothing matches.

## Examples

### Forwarding props to the underlying viewer

```tsx
<MediaViewer
  src={url}
  mime="image/png"
  imageProps={{ zoomable: false, checkerboard: false }}
/>
```

### Custom fallback

```tsx
<MediaViewer src={url} mime="application/zip" fallback={<MyDownloadCard url={url} />} />
```
