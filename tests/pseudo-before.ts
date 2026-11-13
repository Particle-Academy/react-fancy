import { resolveVars } from "./rendered-css";

/**
 * The computed style of an element's `::before`, under jsdom.
 *
 * jsdom does the cascade for elements but not for pseudo-elements:
 * `getComputedStyle(el, "::before")` is "not implemented". A touch-density
 * grab area lives on `::before` (ResizablePanels' separator), so a test needs
 * to read it some other way.
 *
 * This mirrors the cascade onto a real element. Every rule in the document
 * whose selector ends in `::before` is copied with `::before` replaced by
 * `> [data-test-pseudo-before]`, and a span carrying that attribute is put
 * inside the element. Every mirrored selector gains the same one attribute of
 * specificity and keeps its source order, so the rules rank against each other
 * exactly as they rank on the real pseudo-element. The span inherits from the
 * element, as `::before` does.
 *
 * Call `dispose()` before the next measurement: the span is markup the
 * component never rendered.
 */

const MARK = "data-test-pseudo-before";

/** Split a selector list on top-level commas (not the ones inside `:is(...)`). */
function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const BEFORE = /::?before$/;

export type PseudoBefore = {
  /** The stand-in element: read it with `getComputedStyle`. */
  el: HTMLElement;
  /** A property of the stand-in, `var()` resolved. */
  get(prop: string): string;
  /** A length property in px: `var()`, `calc()`, `max()`, `min()` evaluated. */
  px(prop: string): number;
  dispose(): void;
};

export function pseudoBefore(host: Element): PseudoBefore {
  const mirrored: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    if ((sheet.ownerNode as Element | null)?.hasAttribute?.("data-pseudo-mirror")) continue;
    for (const rule of Array.from(sheet.cssRules)) {
      const style = (rule as CSSStyleRule).style;
      const selectorText = (rule as CSSStyleRule).selectorText;
      if (!style || !selectorText) continue;
      const parts = splitSelectors(selectorText)
        .filter((s) => BEFORE.test(s))
        .map((s) => `${s.replace(BEFORE, "").trim() || "*"} > [${MARK}]`);
      if (parts.length) mirrored.push(`${parts.join(", ")} { ${style.cssText} }`);
    }
  }
  const sheet = document.createElement("style");
  sheet.setAttribute("data-pseudo-mirror", "");
  sheet.textContent = mirrored.join("\n");
  document.head.append(sheet);

  const el = document.createElement("span");
  el.setAttribute(MARK, "");
  host.prepend(el);

  const get = (prop: string) => resolveVars(el, getComputedStyle(el).getPropertyValue(prop));
  return {
    el,
    get,
    px: (prop: string) => lengthPx(get(prop)),
    dispose() {
      el.remove();
      sheet.remove();
    },
  };
}

export type Grab = {
  /** The line's own thickness: its width (vertical line) or height, at least its min-*. */
  line: number;
  /** How far the ::before reaches past the line on the start side (inline or block). */
  start: number;
  /** ... and on the end side. */
  end: number;
  /** line + start + end: the grab area across the line. */
  across: number;
};

/**
 * A ResizablePanels separator's grab area across its line, from its own
 * computed size and its `::before` insets. A vertical line (side-by-side
 * panels, `aria-orientation="vertical"`) is measured on the inline axis, a
 * horizontal one on the block axis. A logical inset that is unset (`auto`) falls back to
 * the physical one (LTR: left / top start, right / bottom end), which is what
 * the default `before:-left-1.5` classes set. An inset that is unset either way
 * counts as 0: an unmeasurable grab area is no grab area, never a pass.
 */
export function separatorGrab(sep: Element): Grab {
  const vertical = sep.getAttribute("aria-orientation") === "vertical";
  const own = (prop: string) => {
    const v = lengthPx(resolveVars(sep, getComputedStyle(sep).getPropertyValue(prop)));
    return Number.isFinite(v) ? v : 0;
  };
  const line = Math.max(own(vertical ? "width" : "height"), own(vertical ? "min-width" : "min-height"));
  const b = pseudoBefore(sep);
  try {
    const inset = (logical: string, physical: string) => {
      const l = b.get(logical);
      // jsdom computes an unset logical inset as `auto`.
      const v = lengthPx(l !== "" && l !== "auto" ? l : b.get(physical));
      return Number.isFinite(v) ? -v : 0;
    };
    const start = vertical ? inset("inset-inline-start", "left") : inset("inset-block-start", "top");
    const end = vertical ? inset("inset-inline-end", "right") : inset("inset-block-end", "bottom");
    return { line, start, end, across: line + start + end };
  } finally {
    b.dispose();
  }
}

/**
 * Evaluate a resolved length (`-6px`, `calc(-1 * calc((44px - 1px) / 2))`,
 * `max(21.5px, 43px)`) to px. Only numbers, px, rem, + - * /, parentheses and
 * calc / max / min are accepted; anything else is an error, never a guess.
 */
export function lengthPx(value: string): number {
  const v = value.trim();
  if (v === "" || v === "auto" || v === "none") return Number.NaN;
  const expr = v
    .replace(/(-?[\d.]+)rem/g, "($1*16)")
    .replace(/(-?[\d.]+)px/g, "($1)")
    .replace(/calc\(/g, "(")
    .replace(/max\(/g, "M(")
    .replace(/min\(/g, "m(");
  if (!/^[\d.\s+\-*/(),Mm]*$/.test(expr)) throw new Error(`lengthPx: cannot evaluate "${value}"`);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function("M", "m", `return (${expr});`) as (a: typeof Math.max, b: typeof Math.min) => number;
  return fn(Math.max, Math.min);
}
