# QrCode

A QR code rendered as an SVG, with **no dependencies** — the encoder is part of
the component.

ISO/IEC 18004, versions 1–40, error correction L/M/Q/H, and numeric /
alphanumeric / byte modes selected automatically.

## Import

```tsx
import { QrCode } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<QrCode value="SN-4829-13" size={192} label="Asset tag for pump 14" />
```

## `value` is any string — this is not a link component

A QR code is a byte container. Most of what belongs in one is **not** a web
address, and those are the cases where the format earns its place, because they
need no network at all — the scanner reads the value and that *is* the payload.

```tsx
// An identifier, read off a label in a warehouse with no signal.
<QrCode value="SN-4829-13" label="Asset tag for pump 14" />

// Digits only — numeric mode, a third the size of the same value as text.
<QrCode value="482913" label="Order reference" />

// WiFi credentials. Phone cameras offer "Join network" directly.
// Escape \ ; , : in the SSID and password with a backslash.
<QrCode value="WIFI:T:WPA;S:Guest;P:hunter2;;" label="Join the guest WiFi" />

// A contact, as MeCard — shorter than vCard and widely recognised.
<QrCode value="MECARD:N:Okafor,Ada;TEL:+15550100;EMAIL:ada@example.com;;" label="Ada Okafor's contact card" />

// Other URI schemes are just strings too.
<QrCode value="tel:+15550100" label="Call the service desk" />
<QrCode value="geo:51.5033,-0.1196" label="Meet at the south entrance" />

// A link is ONE payload among many, not the default.
<QrCode value="https://example.com/menu" label="Today's menu" />
```

Nothing in the component inspects or validates `value`. It encodes the bytes
you give it, which is why it carries any of the above without a per-format API.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | — | Any string. An empty string renders a valid empty symbol rather than throwing. |
| label | `string` | — | **Required.** Accessible name. Describe what the code is *for*, not the artefact. |
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

## Mode selection is why a short value is a big symbol

Automatic, and worth understanding because it decides how scannable the result
is at a given pixel size:

| Value | Mode | Bits per character | Version at `M` |
|---|---|---|---|
| `482913` | numeric | 3⅓ | 1 (21 modules) |
| `SN-4829-13` | alphanumeric | 5½ | 1 (21 modules) |
| `sn-4829-13` | byte | 8 | 1 (21 modules) |
| a 47-character URL | byte | 8 | 4 (33 modules) |

Uppercase matters: alphanumeric mode covers `0-9 A-Z` and `$%*+-./: ` only, so
**lower-casing an identifier pushes it into byte mode** and makes the symbol
bigger for the same information. If you control the format of a code you are
printing, uppercase it.

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
<QrCode value={serial} label="Asset tag" foreground="#0b0b0c" background="#ffffff" />
```

**3. Reaching for `"H"` because it sounds safer.** `"H"` survives about 30%
damage against `"M"`'s 15%, but it holds a third less — so the same value needs
a larger symbol, and at the same pixel width that means *smaller modules*. On a
phone screen `"H"` can read worse than `"M"`. Raise it for print, for a label
that will be scuffed or oiled, or when a logo covers part of the symbol.

## It is an image of a value, not the value

A QR code is unusable to anyone who cannot point a second device at the screen —
every screen-reader user, and anyone whose phone is the device displaying it. So
`label` is required, **and the value should also be selectable text** beside it.
An `aria-label` cannot carry a serial number or a WiFi password someone is
expected to read off.

```tsx
<div className="flex flex-col items-center gap-3">
  <QrCode value={serial} label="Asset tag for pump 14" background="#ffffff" />
  <code className="select-all text-sm">{serial}</code>
</div>
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
blurred edge guesses. For a printed asset label this is the difference between
a code that reads first time and one a warehouse worker swears at.

## The encoder on its own

Exported alongside the component, for a consumer that needs modules rather than
an SVG — a canvas, a PDF, a thermal label printer, a terminal:

```tsx
import { encodeQr, selectMode } from "@particle-academy/react-fancy";

const symbol = encodeQr("SN-4829-13", { errorCorrection: "Q" });
symbol.modules;         // boolean[][], true is dark
symbol.size;            // version * 4 + 17
symbol.version;         // 1-40
symbol.mode;            // the mode chosen
symbol.mask;            // the mask chosen by penalty scoring
selectMode("482913");   // "numeric"
```

`encodeQr` throws a `RangeError` rather than truncating a value that does not
fit. That is deliberate: a truncated symbol scans cleanly and yields the wrong
string, which is silent corruption on a surface whose entire job is to carry a
value accurately.

Capacity at the largest symbol (version 40, level `L`): **7,089** digits,
**4,296** alphanumeric characters, or **2,953** bytes.

## Not supported

Kanji mode and structured append. Neither has a caller here, and an untested
branch in an encoder is worse than an absent one — the failure is a code a
phone quietly refuses to read.
