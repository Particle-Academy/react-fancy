# PdfViewer

A standalone PDF viewer — embeds the document via the browser's native PDF
plugin (`<object>`), falling back to an `<iframe>`, then to a download link.
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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | — | PDF source (`http(s):` / `data:` / `blob:`) |
| title | `string` | `"PDF document"` | Accessible title for the embedded document |
| className | `string` | — | Classes for the container |
| style | `CSSProperties` | — | Styles for the container (e.g. a height) |
