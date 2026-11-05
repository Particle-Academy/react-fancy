import { encodeQr, type QrErrorCorrection, type QrMode } from "./qr-encode";
import { modulePath } from "./qr-path";

/**
 * Files of a QR code: a standalone SVG and a PNG.
 *
 * Both are drawn from {@link modulePath}, the builder `<QrCode>` uses on
 * screen, so a downloaded file carries exactly the modules the person saw.
 *
 * ## A file is always opaque
 *
 * On screen a code can inherit its colours: `currentColor` modules on a
 * `transparent` background take whatever the page puts behind them. A file has
 * no page behind it. A PNG with a transparent background opens dark-on-dark in
 * every image viewer with a dark theme, and dark-on-dark does not scan. So in
 * a file, `transparent` (or no background) becomes white and `currentColor`
 * becomes black. Explicit colours are kept as given: choosing a dark
 * background is the caller's decision, and the docs say what it costs.
 */

export interface QrCodeFileOptions {
  /**
   * What the code is FOR, e.g. "Your sign-up link". Written into the SVG as
   * its `<title>` and accessible name, so the file still says what it is when
   * it is opened, attached or printed somewhere else. Required, as on
   * `<QrCode>`.
   */
  label: string;
  errorCorrection?: QrErrorCorrection;
  mode?: QrMode;
  version?: number;
  /** Modules of quiet zone. Default 4, the standard's minimum. */
  quietZone?: number;
  /** Module colour. Default and `currentColor` both mean `#000000`. */
  foreground?: string;
  /** Background colour. Default and `transparent` both mean `#ffffff`. */
  background?: string;
}

export interface QrCodeSvgOptions extends QrCodeFileOptions {
  /** Width and height in pixels. Default: ten pixels per module. */
  size?: number;
}

export interface QrCodePngOptions extends QrCodeFileOptions {
  /**
   * Pixels per module, rounded DOWN to a whole number. Default 10.
   *
   * Whole numbers only, because a module drawn across a fraction of a pixel
   * gets a blurred edge, and a scanner reading a blurred edge guesses. Clamped
   * to at least 1, and down so the image is at most 8192 pixels a side.
   */
  scale?: number;
  /**
   * The canvas to draw on. Default: a new `<canvas>`. Pass one to draw where
   * there is no `document` (an `OffscreenCanvas` will not do: it has no
   * `toBlob`) or to inspect the drawing in a test.
   */
  canvas?: HTMLCanvasElement;
}

const DEFAULT_PIXELS_PER_MODULE = 10;
const MAX_PNG_SIDE = 8192;
const WHITE = "#ffffff";
const BLACK = "#000000";

function fileBackground(colour: string | undefined): string {
  return colour === undefined || colour === "" || colour === "transparent" || colour === "none" ? WHITE : colour;
}

function fileForeground(colour: string | undefined): string {
  return colour === undefined || colour === "" || colour === "currentColor" ? BLACK : colour;
}

const REPLACEMENT = String.fromCharCode(0xfffd);

/**
 * Text XML 1.0 can carry: C0 controls other than tab, newline and return are
 * dropped (they are invalid even as character references), and a lone
 * surrogate becomes U+FFFD. Without this, one control character in a label
 * makes the whole file unparseable. A loop over code points, not a pattern.
 */
function xmlChars(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
      continue;
    }
    out += char.length === 1 && code >= 0xd800 && code <= 0xdfff ? REPLACEMENT : char;
  }
  return out;
}

/** XML text and attribute escaping. One pass over a fixed character class. */
function xml(text: string): string {
  return xmlChars(text).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function symbolFor(value: string, options: QrCodeFileOptions) {
  const symbol = encodeQr(value, {
    errorCorrection: options.errorCorrection,
    mode: options.mode,
    version: options.version,
  });
  const quietZone = Math.max(0, Math.floor(options.quietZone ?? 4));
  return { symbol, quietZone, extent: symbol.size + quietZone * 2 };
}

/**
 * A QR code as a standalone SVG document, with an XML declaration, a
 * `<title>`, an accessible name and an opaque background.
 *
 * @throws RangeError when the value cannot fit, exactly as `encodeQr` does,
 *   and as cheaply: an impossible value is refused from its length alone.
 */
export function qrCodeSvg(value: string, options: QrCodeSvgOptions): string {
  const { symbol, quietZone, extent } = symbolFor(value, options);
  const size =
    options.size !== undefined && Number.isFinite(options.size) && options.size > 0
      ? options.size
      : extent * DEFAULT_PIXELS_PER_MODULE;
  const label = xml(options.label);

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${extent} ${extent}" shape-rendering="crispEdges" role="img" aria-label="${label}">` +
    `<title>${label}</title>` +
    `<rect width="${extent}" height="${extent}" fill="${xml(fileBackground(options.background))}"/>` +
    `<path d="${modulePath(symbol.modules, quietZone)}" fill="${xml(fileForeground(options.foreground))}"/>` +
    "</svg>\n"
  );
}

/** Whole pixels per module for a symbol `extent` modules wide. */
export function pngScale(scale: number | undefined, extent: number): number {
  const wanted =
    scale === undefined || Number.isNaN(scale) ? DEFAULT_PIXELS_PER_MODULE : Math.floor(scale);
  const ceiling = Math.max(1, Math.floor(MAX_PNG_SIDE / extent));
  return Math.min(Math.max(1, wanted), ceiling);
}

/**
 * A QR code as a PNG, drawn on a canvas from the same path data as the SVG.
 *
 * It does not load the SVG into an `<img>` first. That route needs a `blob:`
 * or `data:` image, which a Content Security Policy of `img-src 'self'`
 * blocks, and the download would then fail on exactly the sites careful
 * enough to set one. `Path2D` takes the SVG path string directly, so the
 * geometry is the SVG's and nothing is fetched.
 *
 * The background is painted over the whole canvas, quiet zone included, before
 * any module. Each colour is set over a known default first: a canvas ignores
 * a colour it cannot parse and keeps the previous one, so an unreadable
 * background would otherwise inherit black and produce a black square.
 */
export function qrCodePng(value: string, options: QrCodePngOptions): Promise<Blob> {
  const { symbol, quietZone, extent } = symbolFor(value, options);
  const scale = pngScale(options.scale, extent);
  const canvas = options.canvas ?? document.createElement("canvas");
  canvas.width = extent * scale;
  canvas.height = extent * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas 2D is unavailable, so no PNG can be drawn"));
  }
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = WHITE;
  ctx.fillStyle = fileBackground(options.background);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = BLACK;
  ctx.fillStyle = fileForeground(options.foreground);
  ctx.fill(new Path2D(modulePath(symbol.modules, quietZone)));

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("The browser produced no PNG for this canvas"));
      }
    }, "image/png");
  });
}

/**
 * A download file name: letters, digits, `.`, `_` and `-`, at most 100
 * characters, with any other run replaced by one `-` and no leading or
 * trailing dot or dash (so no `..`, no path, no hidden file). `fallback` when
 * nothing is left.
 *
 * The one pattern is a single negated character class with one quantifier, so
 * it is linear: there is no way to match the same character two ways.
 */
export function safeFileName(name: string, fallback: string): string {
  const replaced = name.slice(0, 1000).replace(/[^A-Za-z0-9._-]+/g, "-");
  let start = 0;
  let end = replaced.length;
  while (start < end && (replaced[start] === "." || replaced[start] === "-")) {
    start += 1;
  }
  while (end > start && (replaced[end - 1] === "." || replaced[end - 1] === "-")) {
    end -= 1;
  }
  const trimmed = replaced.slice(start, Math.min(end, start + 100));
  return trimmed === "" ? fallback : trimmed;
}
