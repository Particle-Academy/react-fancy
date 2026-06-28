# ImageViewer

A standalone image viewer: fits the image to its container, with optional
Ctrl/⌘+wheel zoom, click-drag panning, and a transparency checkerboard. Works
anywhere on its own and is what `MediaViewer` renders for images (SVG included).

## Import

```tsx
import { ImageViewer } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<ImageViewer src="/logo.png" alt="logo.png" style={{ height: 320 }} />
```

Give the container a height (via `style` or `className`) — it fills its box.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | — | Image source (`http(s):` / `data:` / `blob:`) |
| alt | `string` | `""` | Alt text (also the download filename hint) |
| fit | `"contain" \| "cover" \| "none"` | `"contain"` | How the image sits at zoom 1 |
| zoomable | `boolean` | `true` | Ctrl/⌘+wheel zoom + zoom controls |
| pannable | `boolean` | `true` | Click-drag panning |
| controls | `boolean` | = `zoomable` | Show the floating zoom controls |
| minZoom | `number` | `0.25` | Minimum zoom factor |
| maxZoom | `number` | `8` | Maximum zoom factor |
| checkerboard | `boolean` | `true` | Paint a checkerboard behind the image |
| viewport | `{ panX; panY; zoom }` | — | Controlled pan + zoom |
| defaultViewport | `{ panX; panY; zoom }` | `{0,0,1}` | Initial viewport (uncontrolled) |
| onViewportChange | `(vp) => void` | — | Called whenever pan/zoom changes |
| onLoad | `() => void` | — | Image finished loading |
| onError | `() => void` | — | Image failed to load |
| className | `string` | — | Classes for the viewport container |
| style | `CSSProperties` | — | Styles for the container (e.g. a height) |

## Human+ notes

The viewport is controllable (`viewport` + `onViewportChange`) so an agent
bridge can pan/zoom the image to point at something. Double-click resets zoom.

## Examples

### Static, non-interactive

```tsx
<ImageViewer src="/thumb.jpg" zoomable={false} pannable={false} checkerboard={false} />
```

### Controlled viewport

```tsx
const [vp, setVp] = useState({ panX: 0, panY: 0, zoom: 1 });
<ImageViewer src="/diagram.png" viewport={vp} onViewportChange={setVp} />
```
