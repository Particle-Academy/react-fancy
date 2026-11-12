import { expect } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { contrast, defaultColourOf } from "./contrast-helper";

/**
 * Shared assertions for the grey-text contrast tests (6.12.0), following the
 * FileUpload pattern from 6.11.1: colours are read off the RENDERED classes (a
 * token's fallback, or a bare palette class), so the test measures what ships
 * for an app that sets no `--fancy-*` variable.
 *
 * The surface is the nearest painted ancestor, read the same way, falling back
 * to the kit's default surface (`--fancy-surface` white, `--fancy-surface-dark`
 * zinc-900). A translucent fill (`bg-zinc-50/60`) is skipped in favour of what
 * is under it, which is the darker of the two for a light tint and so the
 * stricter surface to measure on.
 *
 * Bars: readable text and placeholders >= 4.5:1 (WCAG 1.4.3 AA); the glyph of
 * an icon-only control >= 3:1 (WCAG 1.4.11), at rest and on hover.
 */

export type Pair = { light: string; dark: string };
export const DEFAULT_SURFACE: Pair = { light: "white", dark: "zinc-900" };
export const AA = 4.5;
export const NON_TEXT = 3;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

export function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  const unmount = () => {
    act(() => root.unmount());
    host.remove();
  };
  mounted.push(unmount);
  return { host, root, unmount };
}

export function unmountAll() {
  while (mounted.length) {
    try {
      mounted.pop()!();
    } catch {
      /* already unmounted */
    }
  }
}

export const cls = (el: Element | null | undefined) => el?.getAttribute("class") ?? "";

type Variant = "rest" | "hover" | "placeholder" | "empty-before";

const PREFIX: Record<Variant, { light: string; dark: string }> = {
  rest: { light: "", dark: "dark:" },
  hover: { light: "hover:", dark: "dark:hover:" },
  placeholder: { light: "placeholder:", dark: "dark:placeholder:" },
  "empty-before": { light: "empty:before:", dark: "dark:empty:before:" },
};

/** Text colour of `el` per mode. Inherits from ancestors when `el` sets none. */
export function fg(el: Element | null | undefined, variant: Variant = "rest", utility = "text"): Pair {
  if (!el) throw new Error("fg: element not found");
  const p = PREFIX[variant];
  const read = (node: Element, prefix: string) => defaultColourOf(cls(node), prefix as never, utility);
  const fail = () => new Error(`fg: no ${variant} text colour on <${el.tagName.toLowerCase()} class="${cls(el)}">`);

  // A placeholder only ever takes its colour from its own `placeholder:` class.
  if (variant === "placeholder" || variant === "empty-before") {
    const light = read(el, p.light);
    if (!light) throw fail();
    return { light, dark: read(el, p.dark) ?? light };
  }

  // A hover colour set for both modes needs no resting colour to resolve.
  if (variant === "hover") {
    const hl = read(el, p.light);
    const hd = read(el, p.dark);
    if (hl && hd) return { light: hl, dark: hd };
  }

  // Resting colour: the element's own, else the nearest ancestor's (text
  // inherits). A light class without a `dark:` twin paints in dark too.
  let light: string | null = null;
  let dark: string | null = null;
  for (let n: Element | null = el; n; n = n.parentElement) {
    const l = read(n, "");
    const d = read(n, "dark:");
    dark ??= d;
    if (l) {
      light = l;
      dark ??= l;
      break;
    }
  }
  if (!light || !dark) throw fail();
  if (variant === "rest") return { light, dark };

  // Hover: the element's own hover colour, else it stays at rest. In dark,
  // `dark:hover:` wins; a light-only `hover:` class comes next, because the
  // custom dark variant compiles to `:where(...)`, which adds no specificity,
  // so `.hover\:x:hover` (two) beats `.dark\:y:where(...)` (one) whatever the
  // source order. Only then the resting dark colour.
  const hl = read(el, p.light);
  const hd = read(el, p.dark);
  return { light: hl ?? light, dark: hd ?? hl ?? dark };
}

/** Nearest painted surface per mode (see the header comment). */
export function surface(el: Element | null | undefined, fallback: Pair = DEFAULT_SURFACE): Pair {
  let light: string | null = null;
  let dark: string | null = null;
  // A token whose default is `transparent` (the Modal header) paints nothing:
  // what is under it is the surface.
  const painted = (v: string | null) => (v === "transparent" ? null : v);
  for (let n = el ?? null; n; n = n.parentElement) {
    light ??= painted(defaultColourOf(cls(n), "", "bg"));
    dark ??= painted(defaultColourOf(cls(n), "dark:", "bg"));
    if (light && dark) break;
  }
  return { light: light ?? fallback.light, dark: dark ?? fallback.dark };
}

export function ratio(f: string, b: string) {
  return contrast(f, b);
}

/** Every mode clears `bar` for `f` on `b`. */
export function expectContrast(label: string, f: Pair, b: Pair, bar: number) {
  for (const mode of ["light", "dark"] as const) {
    const r = contrast(f[mode], b[mode]);
    expect(r, `${label} (${mode}): ${f[mode]} on ${b[mode]} = ${r.toFixed(2)}:1, bar ${bar}`).toBeGreaterThanOrEqual(bar);
  }
}

/** Readable text: AA on its own surface (or the one given). */
export function expectText(label: string, el: Element | null | undefined, on?: Pair, variant: Variant = "rest") {
  expectContrast(label, fg(el, variant), on ?? surface(el), AA);
}

/** An icon-only control: 3:1 at rest and on hover. */
export function expectControl(label: string, el: Element | null | undefined, on?: Pair) {
  const b = on ?? surface(el?.parentElement);
  expectContrast(`${label} at rest`, fg(el, "rest"), b, NON_TEXT);
  expectContrast(`${label} on hover`, fg(el, "hover"), b, NON_TEXT);
}
