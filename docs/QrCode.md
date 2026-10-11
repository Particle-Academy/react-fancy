# QrCode

A QR code rendered as an SVG, with **no dependencies** — the encoder is part of
the component.

ISO/IEC 18004, versions 1–40, error correction L/M/Q/H, with numeric,
alphanumeric and byte modes selected automatically.

## Import

```tsx
import { QrCode } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<QrCode
  value="https://alphar.tail1234.ts.net:7421/pair#482913"
  size={192}
  label="Pair this device"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | — | What the code carries. An empty string renders a valid empty symbol rather than throwing. |
| label | `string` | — | **Required.** Accessible name. Describe the destination ("Pair this device"), not the artefact ("QR code"). |
| size | `number` | `192` | Rendered width and height in pixels. |
| errorCorrection | `"L" \| "M" \| "Q" \| "H"` | `"M"` | Damage tolerance. See the note below — higher is not automatically better. |
| quietZone | `number` | `4` | Modules of clear margin. The standard's minimum is 4. |
| foreground | `string` | `"currentColor"` | Module colour. |
| background | `string` | `"transparent"` | Background colour. See the note below. |
| mode | `"numeric" \| "alphanumeric" \| "byte"` | *auto* | Force an encoding mode. Rarely useful. |
| version | `number` | *auto* | Force a symbol version 1–40, fixing the module count. Throws if the value does not fit. |

Every other SVG attribute passes through. `viewBox` and SVG's own `version` are
not accepted — the component owns the first, and the second collides with the QR
symbol version.

## Three ways a perfect-looking code fails to scan

None of these are visible in a screenshot review, which is why they are here
rather than in a footnote.

**1. No quiet zone.** It is not padding — it is how a scanner finds the
symbol's edge. A code flush against surrounding content is the single most
common cause of "the QR code doesn't work". `quietZone={0}` is allowed, because
a consumer compositing their own margin has a legitimate reason, but it is not
a space saving.

**2. A transparent background on a dark surface.** The default inherits
whatever is behind it, so on a dark panel the symbol renders dark-on-dark and
most scanners refuse it. Contrast is what gets scanned, not the dark modules on
their own:

```tsx
<QrCode value={url} label="Pair" foreground="#0b0b0c" background="#ffffff" />
```

**3. Reaching for `"H"` because it sounds safer.** `"H"` survives about 30%
damage against `"M"`'s 15%, but it holds a third less — so the same value needs
a larger symbol, and at the same pixel width that means *smaller modules*. On a
phone screen `"H"` can read worse than `"M"`. Raise it for print, for a label
that will be scuffed, or when a logo covers part of the symbol.

## It is an image of a value, not the value

A QR code is unusable to anyone who cannot point a second device at the screen —
every screen-reader user, and anyone whose phone is the device displaying it. So
`label` is required, **and the value should also be reachable as text or a
link** beside it. An `aria-label` cannot carry a URL someone is expected to
type.

```tsx
<div className="flex flex-col items-center gap-3">
  <QrCode value={pairUrl} label="Pair this device" background="#ffffff" />
  <code className="text-sm">{pairUrl}</code>
</div>
```

## A PIN is denser than a URL

Mode selection is automatic and it matters. Numeric mode packs three digits into
ten bits where byte mode spends twenty-four, so a six-digit PIN is a version 1
symbol — the largest modules and the easiest read:

```tsx
<QrCode value="482913" label="Pairing PIN" />   {/* 21 modules + quiet zone */}
```

## Why SVG, and one path

The symbol is one `<path>` of unit squares on a module-unit `viewBox`, not a
`<rect>` per module. A version 10 symbol has over three thousand modules, so a
rect each would be three thousand DOM nodes for something that never changes
after render. Horizontal runs are packed into single rectangles.

The module-unit viewBox is what makes `size` free: the symbol is resolution
independent, so it stays crisp at any size and prints at the printer's
resolution. That is not only cosmetic — a raster code scaled to a non-integer
multiple of its module size has blurred module edges, and a scanner reading a
blurred edge guesses.

## The encoder on its own

Exported alongside the component, for a consumer that needs modules rather than
an SVG — a canvas, a PDF, a thermal printer, a terminal:

```tsx
import { encodeQr, selectMode } from "@particle-academy/react-fancy";

const symbol = encodeQr("https://example.com", { errorCorrection: "Q" });
symbol.modules;         // boolean[][], true is dark
symbol.size;            // version * 4 + 17
symbol.version;         // 1-40
symbol.mask;            // the mask chosen by penalty scoring
selectMode("482913");   // "numeric"
```

`encodeQr` throws a `RangeError` rather than truncating a value that does not
fit. That is deliberate: a truncated symbol scans cleanly and yields the wrong
string, which is silent corruption on a surface whose entire job is to carry a
value accurately.

## Not supported

Kanji mode and structured append. Neither has a caller here, and an untested
branch in an encoder is worse than an absent one — the failure is a code a
phone quietly refuses to read.
