import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compile } from "tailwindcss";

/**
 * Real CSS for a jsdom test: compiles the classes actually present in the
 * document with the consumer's Tailwind (theme + preflight + utilities, plus
 * the kit's own dark variant), and installs it so `getComputedStyle` reads what
 * a browser would cascade, rather than a test reading a class string.
 *
 * jsdom does not understand `@layer`, `@property` or nested at-rules, so the
 * output is flattened first: layer wrappers are removed (keeping their order,
 * which is the order Tailwind emits them in), `@property` and `@supports`
 * blocks are dropped, and `var(--tw-border-style)` is resolved to its
 * registered initial value, `solid`. Nothing else is rewritten.
 *
 * Why this exists (6.15.1): 6.15.0 asserted that a native checkbox's CLASS
 * named the strong border token. The class was there; the browser draws native
 * checkboxes itself and ignores it. A class assertion cannot see that, so the
 * outline tests measure through computed style instead.
 */

const require = createRequire(import.meta.url);

const ENTRY = [
  "@layer theme, base, components, utilities;",
  '@import "tailwindcss/theme.css" layer(theme);',
  '@import "tailwindcss/preflight.css" layer(base);',
  '@import "tailwindcss/utilities.css" layer(utilities);',
  "@custom-variant dark (&:where(.dark, .dark *, [data-theme=dark], [data-theme=dark] *));",
].join("\n");

/**
 * `forceHover` (6.19.1): jsdom has no pointer, so `:hover` never matches, and
 * Tailwind wraps the variant in `@media (hover: hover)`, which `unnest` drops.
 * Redefining the variant as `&[data-force-hover]` keeps the specificity a real
 * `:hover` adds (one attribute for one pseudo-class), so the same rule wins
 * the cascade; a test marks the element it means to hover.
 */
async function compiler(opts: { forceHover?: boolean } = {}) {
  const entry = opts.forceHover ? `${ENTRY}\n@custom-variant hover (&[data-force-hover]);` : ENTRY;
  return compile(entry, {
    base: process.cwd(),
    loadStylesheet: async (id: string, base: string) => {
      const resolved = id.startsWith("tailwindcss")
        ? require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id)
        : path.resolve(base, id);
      return { path: resolved, base: path.dirname(resolved), content: await readFile(resolved, "utf8") };
    },
  });
}

/** Index of the `}` closing the block whose `{` is at `open`. */
function closing(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i;
  }
  return css.length;
}

/**
 * Un-nest `&` rules, which jsdom cannot parse: `.a { x: 1; &:where(.dark *) { y: 2 } }`
 * becomes `.a { x: 1; } .a:where(.dark *) { y: 2 }`. A nested at-rule (a
 * responsive `@media` variant) is dropped; none of the measured states use one.
 */
function unnest(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf("{", i);
    if (brace < 0) {
      out += css.slice(i);
      break;
    }
    const selector = css.slice(i, brace).trim();
    const end = closing(css, brace);
    const body = css.slice(brace + 1, end);
    if (selector.startsWith("@") || !body.includes("{")) {
      out += `${selector} {${body}}\n`;
    } else {
      let own = "";
      let j = 0;
      const nested: string[] = [];
      while (j < body.length) {
        const b = body.indexOf("{", j);
        if (b < 0) {
          own += body.slice(j);
          break;
        }
        // The nested selector starts after the last declaration before it.
        const lastSemi = body.lastIndexOf(";", b);
        const start = Math.max(lastSemi + 1, j);
        own += body.slice(j, start);
        const inner = body.slice(start, b).trim();
        const e = closing(body, b);
        if (inner.startsWith("&")) nested.push(unnest(`${selector}${inner.slice(1)} {${body.slice(b + 1, e)}}`));
        j = e + 1;
      }
      if (own.trim()) out += `${selector} {${own}}\n`;
      out += nested.join("");
    }
    i = end + 1;
  }
  return out;
}

/** Remove `@layer x { … }` wrappers, keep their bodies; drop @property / @supports / `@layer a, b;`. */
export function flatten(css: string): string {
  return unnest(flattenLayers(css));
}

function flattenLayers(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf("@", i);
    if (at < 0) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, at);
    const head = css.slice(at, at + 40);
    const brace = css.indexOf("{", at);
    const semi = css.indexOf(";", at);
    if (/^@layer\s+[\w\s,-]+;/.test(head) && semi >= 0 && (brace < 0 || semi < brace)) {
      i = semi + 1;
    } else if (/^@layer\b/.test(head)) {
      const end = closing(css, brace);
      out += flattenLayers(css.slice(brace + 1, end));
      i = end + 1;
    } else if (/^@(property|supports)\b/.test(head)) {
      i = closing(css, brace) + 1;
    } else {
      // Any other at-rule (e.g. @media, @keyframes): keep as written.
      const end = brace >= 0 && (semi < 0 || brace < semi) ? closing(css, brace) : semi;
      out += css.slice(at, end + 1);
      i = end + 1;
    }
  }
  return out.replace(/var\(--tw-border-style\)/g, "solid");
}

/** Every class used anywhere under `root`. */
function classesUnder(root: ParentNode): string[] {
  const found = new Set<string>();
  root.querySelectorAll("[class]").forEach((el) => {
    for (const c of (el.getAttribute("class") ?? "").split(/\s+/)) if (c) found.add(c);
  });
  return [...found];
}

let installed: HTMLStyleElement | null = null;

/** Compile and install the CSS for every class currently in the document. */
export async function installRenderedCss(opts: { forceHover?: boolean } = {}): Promise<string> {
  const { build } = await compiler(opts);
  const css = flatten(build(classesUnder(document)));
  installed?.remove();
  installed = document.createElement("style");
  installed.setAttribute("data-rendered-css", "");
  installed.textContent = css;
  document.head.append(installed);
  return css;
}

export function removeRenderedCss() {
  installed?.remove();
  installed = null;
}

/** Index of the `)` closing the paren whose `(` is at `open`. */
function closingParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return i;
  }
  return s.length;
}

/**
 * Substitute every `var(--x, fallback)` in `value` the way a browser would for
 * `el`: the custom property's computed (inherited) value if it is set, else the
 * fallback, recursively. jsdom computes custom properties but leaves `var()`
 * unsubstituted in ordinary properties, so `accent-color` reads as the raw
 * expression; this reads what it resolves to.
 */
export function resolveVars(el: Element, value: string, depth = 0): string {
  if (depth > 10) throw new Error(`resolveVars: too deep in "${value}"`);
  const at = value.indexOf("var(");
  if (at < 0) return value.trim();
  const end = closingParen(value, at + 3);
  const inner = value.slice(at + 4, end);
  const comma = inner.indexOf(",");
  const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
  const fallback = comma < 0 ? "" : inner.slice(comma + 1);
  const set = getComputedStyle(el).getPropertyValue(name).trim();
  const replaced = set ? resolveVars(el, set, depth + 1) : resolveVars(el, fallback, depth + 1);
  return resolveVars(el, value.slice(0, at) + replaced + value.slice(end + 1), depth + 1);
}

/** `border-top-width` as px. jsdom leaves keywords unresolved, so `medium` etc. read as NaN. */
export function borderTopPx(el: Element): number {
  const cs = getComputedStyle(el);
  if (cs.borderTopStyle === "none" || cs.borderTopStyle === "hidden") return 0;
  const m = cs.borderTopWidth.match(/^([\d.]+)px$/);
  return m ? Number(m[1]) : Number.NaN;
}
