# PdfViewer

A standalone PDF viewer with two modes:

- **`src`**: embeds the document via the browser's native PDF plugin
  (`<object>`), falling back to an `<iframe>`, then to a download link.
- **`pages`** (page-image mode): shows page images your app rendered from the
  PDF, behind its own auth, under an access `policy`, with an optional
  `watermark`. The viewer never fetches or references the PDF.

Renders for PDF sources inside `MediaViewer`.

## Import

```tsx
import { PdfViewer } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<PdfViewer src="/report.pdf" title="report.pdf" style={{ height: 600 }} />
```

The viewer fills its container, so give it a height. A `min-h` floor (`20rem`)
is built in so it stays usable even without an explicit height.

The native plugin always shows its own download and print buttons and exposes
the file's URL, and a page cannot restrict it. If a viewer must not get the
file, use page-image mode.

## Page-image mode

```tsx
<PdfViewer
  frame
  title="contract-7.pdf"
  pages={{ count: 12, url: (page, scale) => `/documents/7/pages/${page}.png?scale=${scale}` }}
  policy={{ download: false, print: false, copy: false, screenshot: "deter" }}
  watermark={{ text: "Jane Doe · jane@example.com · 2026-10-21 14:02" }}
  style={{ height: 640 }}
/>
```

Your app turns the PDF into one image per page on its server, with whatever
tool it already uses, and serves them behind its own auth. react-fancy only
displays them. The `pages.url` images are the only requests the viewer makes;
`src` is ignored in this mode, even if you pass one.

- **`url(page, scale)`**: `page` is 1-based. `scale` is a resolution hint: the
  zoom times the device pixel ratio, rounded **up** to one of `1`, `1.5`, `2`,
  `3` or `4`, so a page is fetched at a handful of sizes rather than once per
  zoom click. Render scale 1 at a width that reads sharply at fit-width in your
  layout (e.g. 1000-1200 px).
- **`aspectRatio`** (optional, width / height) sizes a page before its image
  arrives. Default A4 portrait. Each page switches to its image's real ratio
  once it has loaded.
- **Lazy**: only pages near the viewport get an `<img>` (a viewport's height
  above and below).
- **Toolbar**: previous / next page with "n / total", zoom out / zoom
  percentage (click to reset) / zoom in, **Width** (fit width, which is 100%)
  and **Page** (fit one page to the height). With `frame`, the `FauxClient`
  frame adds full screen; the current page stays in place when the viewer
  resizes.
- **No search.** Page images carry no text, so there is nothing to search.
  This is a consequence of not sending the PDF.
- **Controlled state** for agents and hosts: `page` / `onPageChange` and
  `zoom` / `onZoomChange`. Stable handles:
  `[data-react-fancy-pdf-viewer-page][data-page="3"]`, and
  `data-react-fancy-pdf-viewer-{prev,next,zoom-in,zoom-out,zoom-reset,fit-width,fit-page}`
  on the buttons.

### Policy: what each flag does and does not do

Every flag defaults to allowed. **These are deterrents.** A web page cannot stop
someone who is determined: anything drawn on a screen can be photographed,
screenshotted or pulled out of devtools. The real protection is that in this
mode the app never serves the PDF, and page images are all a viewer ever gets.

| Flag | Does | Does not |
|------|------|----------|
| `download: false` | Suppresses the context menu ("Save image as…") on the pages, and makes the images non-draggable. There is no download control in this mode at all, whatever the flag. | Stop the page images being captured: they are ordinary images the browser has fetched, visible in devtools and the browser's cache. |
| `print: false` | Print CSS blanks the viewer, so printing (Ctrl/Cmd+P, the browser menu, `window.print()`) produces an empty frame. Ctrl/Cmd+P is also intercepted while focus is inside the viewer. | Stop a screenshot, a "save page", or a user who edits the CSS in devtools. |
| `copy: false` | Turns user selection off. (There is no text layer to copy anyway.) | Anything else; the images can still be captured. |
| `screenshot: "deter"` | Blurs the pages while the tab is hidden or the window has lost focus. On a PrintScreen key it blurs them for 1.5 s and tries to clear the clipboard, best effort. | **Prevent screenshots. A web page cannot.** OS tools, other apps and phone cameras are all out of its reach, and PrintScreen usually captures before the page hears the key. |

### Watermark

```tsx
watermark={{ text: "jane@example.com", opacity: 0.15, angle: -30, density: 1 }}
```

A tiled text overlay drawn over every page in the browser, with
`pointer-events: none`. Defaults: `opacity` 0.15, `angle` -30°, `density` 1
(2 halves the gap between repeats).

**A client-side watermark can be removed with devtools.** If yours must hold,
burn it into the page images on your server: the `url(page, scale)` callback is
the place to ask for that (e.g. a per-viewer URL your server stamps).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | — | PDF source (`http(s):` / `data:` / `blob:`) for the native plugin. Ignored with `pages` |
| pages | `{ count: number; url: (page, scale) => string; aspectRatio?: number }` | — | Page-image mode |
| page | `number` | — | Current page (1-based), controlled |
| defaultPage | `number` | `1` | Starting page, uncontrolled |
| onPageChange | `(page: number) => void` | — | Page changed (toolbar or scrolling) |
| zoom | `number` | — | Zoom, 1 = fit width, controlled (page-image mode) |
| defaultZoom | `number` | `1` | Starting zoom, uncontrolled |
| onZoomChange | `(zoom: number) => void` | — | Zoom changed |
| policy | `{ download?: boolean; print?: boolean; copy?: boolean; screenshot?: "allow" \| "deter" }` | all allowed | See above (page-image mode only) |
| watermark | `{ text: string; opacity?: number; angle?: number; density?: number }` | — | See above (page-image mode only) |
| frame | `boolean` | `false` | Show inside the `FauxClient` frame, with full screen |
| frameProps | `Partial<FauxClientProps>` | — | Passed to the frame |
| title | `string` | `"PDF document"` | Accessible title, and the frame's address-bar text |
| className | `string` | — | Classes for the container |
| style | `CSSProperties` | — | Styles for the container (e.g. a height) |

## Through MediaViewer and FileViewer

Both already forward `pdfProps` untouched, so page-image mode needs no new
props on either:

```tsx
<MediaViewer kind="pdf" src="" pdfProps={{ pages, policy, watermark }} />

// @particle-academy/fancy-code
<FileViewer filename="contract.pdf" mediaProps={{ pdfProps: { pages, policy, watermark } }} />
```
