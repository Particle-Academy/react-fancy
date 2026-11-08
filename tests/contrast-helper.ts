import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * WCAG contrast from the kit's DEFAULT colours, resolved the way a browser
 * would: Tailwind v4's palette is oklch, so the value is read from the
 * installed `tailwindcss/theme.css`, converted to sRGB, rounded to 8 bits
 * (what a computed style — and therefore axe — reports) and only then put
 * through the WCAG 2.x relative-luminance formula.
 *
 * Reading theme.css rather than typing hex keeps this honest across palette
 * revisions: v4's zinc-400 is #9f9fa9, not v3's #a1a1aa, and the difference
 * moves contrast ratios by a few hundredths at exactly the thresholds tested.
 */

type RGB = [number, number, number];

let palette: Map<string, string> | null = null;

function themePalette(): Map<string, string> {
  if (palette) return palette;
  // vitest provides __dirname (and a non-file import.meta.url under jsdom);
  // plain node provides only import.meta.url.
  const here = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(path.resolve(here, "../node_modules/tailwindcss/theme.css"), "utf8");
  palette = new Map();
  for (const m of css.matchAll(/--color-([a-z]+-?\d*):\s*([^;]+);/g)) palette.set(m[1], m[2].trim());
  return palette;
}

function oklchToRgb(l: number, c: number, hDeg: number): RGB {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return lin.map((v) => {
    const x = Math.min(1, Math.max(0, v));
    const enc = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(enc * 255);
  }) as RGB;
}

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

/**
 * `zinc-500`, `white`, `#0a2347`, `var(--color-zinc-500)`, or a literal
 * `oklch(L% C H)` (what a computed style resolves a palette variable to) ->
 * 8-bit sRGB.
 */
export function resolveColour(name: string): RGB {
  const v = name.trim().replace(/^var\(--color-([a-z]+-?\d*)\)$/, "$1");
  if (v.startsWith("#")) return hexToRgb(v);
  if (v.startsWith("oklch(")) {
    const lch = parseOklch(v);
    if (!lch) throw new Error(`unparsed colour ${name}`);
    return oklchToRgb(...lch);
  }
  const raw = themePalette().get(v);
  if (!raw) throw new Error(`unknown colour ${name}`);
  if (raw.startsWith("#")) return hexToRgb(raw);
  const lch = parseOklch(raw);
  if (!lch) throw new Error(`unparsed colour ${name}: ${raw}`);
  return oklchToRgb(...lch);
}

/**
 * `oklch(L% C H)` -> [L 0..1, C, H]. Newer Tailwind writes an achromatic hue as
 * the CSS `none` keyword (`oklch(98.5% 0 none)`, as CI resolves it), older
 * versions as a number. `none` is a missing component, which converts as 0.
 */
export function parseOklch(raw: string): [number, number, number] | null {
  // jsdom's computed style drops the space after the `%` (`oklch(63.7%0.237 25.331)`).
  const m = raw.match(/oklch\(([\d.]+)%\s*([\d.]+)\s+([\d.]+|none)\)/);
  if (!m) return null;
  return [Number(m[1]) / 100, Number(m[2]), m[3] === "none" ? 0 : Number(m[3])];
}

function luminance([r, g, b]: RGB): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** WCAG 2.x contrast ratio between two colours (any order). */
export function contrast(fg: string, bg: string): number {
  const a = luminance(resolveColour(fg));
  const b = luminance(resolveColour(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * The default a class paints when no host token is set: the fallback of a
 * `var(--fancy-x, var(--color-y))` arbitrary value, or the bare palette colour
 * of `text-zinc-500`. `prefix` picks the variant (`""` or `"dark:"`) and
 * `utility` the property (`text`, `fill`, `bg`).
 */
export function defaultColourOf(className: string, prefix: "" | "dark:" | "hover:" | "dark:hover:", utility = "text"): string | null {
  for (const token of className.split(/\s+/)) {
    if (!token.startsWith(prefix + utility + "-")) continue;
    const rest = token.slice(prefix.length + utility.length + 1);
    // `dark:hover:` must not be read as `dark:`.
    if (rest.includes(":") && !rest.startsWith("[")) continue;
    const arb = rest.match(/^\[color:var\(--fancy-[a-z-]+,(.+)\)\]$/);
    if (arb) return arb[1];
    if (/^[a-z]+-\d{2,3}$/.test(rest) || rest === "white" || rest === "black") return rest;
  }
  return null;
}
