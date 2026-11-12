// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";

import { FIXTURES, type DensityFixture } from "./touch-density.fixtures";
import { flatten, installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Touch density (WCAG 2.5.5 Target Size, enhanced: 44 x 44 CSS px), opt-in.
 *
 * `<html data-fancy-density="touch">` makes every interactive react-fancy
 * control at least `--fancy-target-min` (default 44px) on both axes, by
 * min-height / min-width on the element a person taps (the element a
 * bounding-box sweep measures), never on a pseudo-element hit area.
 *
 * HOW THIS MEASURES. jsdom does no layout, so a bounding box is always 0x0 and
 * proves nothing. What it does do is the cascade. So each fixture gets the CSS
 * a consumer's page would have: Tailwind compiled for exactly the classes the
 * component rendered (`installRenderedCss`, as the contrast suites do), then
 * the shipped `styles.css` after it, and `getComputedStyle` is read on every
 * tappable element. min-height / min-width beat `height`, `width`,
 * `max-height` and `max-width` in every browser, so a computed minimum of 44px
 * on a box that is not `display: inline` IS a laid-out box of at least 44px.
 * An inline box ignores min-height, so a target that computes to
 * `display: inline` fails here too.
 *
 * jsdom has no cascade layers, so both sheets are flattened and the density
 * rules win by specificity alone. That matches the browser for the control
 * rules, which live in `@layer utilities` with a higher specificity than any
 * single utility class. The multi-line surface rule lives in `@layer base` so
 * a component's own larger minimum (PromptInput's 5.5rem) wins in a browser;
 * here it reads 44px instead, which is still the floor being asserted.
 *
 * Tappable elements are DISCOVERED, not listed: everything matching TAPPABLE
 * that is not hidden. A control added to a component later is measured the day
 * it appears, and a selector missing from the CSS fails here naming the
 * element.
 */

// A path, not `new URL(..., import.meta.url)`: under jsdom `URL` is jsdom's,
// and readFileSync refuses its non-file scheme.
/**
 * Compiling Tailwind and reading every computed property of every element is
 * slow under a parallel full run (the PhoneInput country list is ~240 options),
 * so these tests get a minute rather than vitest's 5 seconds.
 */
const SLOW = 60_000;

const SOURCE = readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");

/** The shipped sheet, and the same sheet with the density block cut out. */
const START = "/* fancy-density:start */";
const END = "/* fancy-density:end */";
function withoutDensity(css: string): string {
  const a = css.indexOf(START);
  const b = css.indexOf(END);
  if (a < 0 || b < 0) return css;
  return css.slice(0, a) + css.slice(b + END.length);
}

function forJsdom(css: string): string {
  return flatten(css.replace(/\/\*[\s\S]*?\*\//g, ""));
}

const TAPPABLE = [
  "button",
  "a[href]",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "summary",
  "[contenteditable=true]",
  "[contenteditable='']",
  "[draggable=true]",
  ...[
    "button",
    "link",
    "tab",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "checkbox",
    "radio",
    "switch",
    "slider",
    "spinbutton",
    "treeitem",
    "gridcell",
    "combobox",
    "separator",
  ].map((r) => `[role=${r}]`),
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Hidden from everyone, so not a target. `display: none` / `visibility:
 * hidden` read from the compiled CSS (so `hidden`, `md:hidden` and friends
 * count), plus `sr-only`, which is visible to nobody sighted.
 */
function hidden(el: Element): boolean {
  for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
    if (n.hasAttribute("hidden") || n.hasAttribute("inert")) return true;
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return true;
    if (n.classList.contains("sr-only")) return true;
  }
  return false;
}

/**
 * Not targets, by WCAG 2.5.5's own terms or because they are not a tap. Each
 * exemption is named so the list cannot grow quietly:
 *   - a focusable CONTAINER (a code block's `<pre tabindex=0>`, a log, a grid,
 *     a listbox, a tree, a dialog, a tab panel): focusable so a keyboard can
 *     reach or scroll it, sized by its content, and the controls inside it are
 *     measured on their own;
 *   - `<input type="file">`: always visually hidden behind its dropzone, which
 *     is the target and is measured;
 *   - a separator that is not focusable is a divider, not a control.
 */
function exempt(el: Element): string | null {
  if (
    el.matches(
      "pre, [role=log], [role=region], [role=grid], [role=listbox], [role=tree], [role=tabpanel], [role=dialog], [role=application], [role=group]",
    )
  ) {
    return "focusable container";
  }
  if (el.matches("input[type=file]")) return "file input (its dropzone is the target)";
  if (el.matches("[role=separator]:not([tabindex])")) return "divider";
  if (el.closest("[data-fixture-host]")) return "the fixture's own markup, not the kit's";
  return null;
}

function px(el: Element, prop: "min-height" | "min-width"): number {
  const raw = getComputedStyle(el).getPropertyValue(prop);
  if (!raw) return 0;
  const v = resolveVars(el, raw);
  const m = v.match(/^([\d.]+)(px|rem)$/);
  if (!m) return 0;
  return m[2] === "rem" ? Number(m[1]) * 16 : Number(m[1]);
}

/** Replaced / form controls lay out as inline-block even when `display` reads inline. */
const ATOMIC = "input, select, textarea, button, img, video, audio, iframe";

function describeEl(el: Element): string {
  const handles = [...el.attributes]
    .filter((a) => a.name.startsWith("data-react-fancy") || a.name === "role" || a.name === "aria-label" || a.name === "type")
    .map((a) => (a.value ? `${a.name}="${a.value}"` : a.name));
  let within = "";
  if (!handles.some((h) => h.startsWith("data-react-fancy"))) {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const h = [...n.attributes].find((a) => a.name.startsWith("data-react-fancy"));
      if (h) {
        within = ` in [${h.name}]`;
        break;
      }
    }
  }
  return `<${el.tagName.toLowerCase()} ${handles.join(" ")}>${within}`;
}

let root: Root | null = null;
let sheet: HTMLStyleElement | null = null;

function install(css: string) {
  sheet?.remove();
  sheet = document.createElement("style");
  sheet.setAttribute("data-kit-css", "");
  sheet.textContent = forJsdom(css);
  document.head.append(sheet);
}

function mount(f: DensityFixture) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(f.render()));
  if (f.open) act(() => f.open!(host));
}

function unmount() {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
}

afterEach(() => {
  unmount();
  sheet?.remove();
  sheet = null;
  removeRenderedCss();
  document.documentElement.removeAttribute("data-fancy-density");
  document.documentElement.style.removeProperty("--fancy-target-min");
});

function targets(): Element[] {
  return [...document.body.querySelectorAll(TAPPABLE)].filter((el) => !hidden(el) && !exempt(el));
}

function undersized(min: number): string[] {
  return targets()
    .map((el) => ({
      el,
      h: px(el, "min-height"),
      w: px(el, "min-width"),
      inline: !el.matches(ATOMIC) && getComputedStyle(el).display === "inline",
    }))
    .filter(({ h, w, inline }) => h < min || w < min || inline)
    .map(({ el, h, w, inline }) => `${describeEl(el)} min ${w}x${h}${inline ? " (display: inline ignores min sizes)" : ""}`);
}

/** Mount under the opt-in with the page's CSS: Tailwind for its classes, then the kit sheet. */
async function mountTouch(f: DensityFixture) {
  document.documentElement.setAttribute("data-fancy-density", "touch");
  mount(f);
  // A floating popover stays `invisible` until it has measured itself, and
  // jsdom has no layout to measure, so it never would. In a browser it shows.
  document.querySelectorAll("[data-react-fancy-popover].invisible").forEach((el) => el.classList.remove("invisible"));
  await installRenderedCss();
  install(SOURCE);
}

describe('data-fancy-density="touch": every control is at least 44 x 44', () => {
  for (const f of FIXTURES) {
    it(f.name, async () => {
      await mountTouch(f);
      expect(targets().length, `${f.name} rendered no tappable element`).toBeGreaterThan(0);
      const short = undersized(44);
      if (f.gap) {
        // Still a gap. If this fails, it was fixed: delete `gap` from the fixture.
        expect(short.length, `known gap: ${f.gap}`).toBeGreaterThan(0);
        return;
      }
      expect(short).toEqual([]);
    }, SLOW);
  }
});

describe("--fancy-target-min sets the size", () => {
  it("a 48px token makes every control 48px (Pagination, Switch, Checkbox)", async () => {
    document.documentElement.style.setProperty("--fancy-target-min", "48px");
    for (const name of ["Pagination", "Switch size=md", "Checkbox size=md", "Button icon-only size=xs"]) {
      await mountTouch(FIXTURES.find((f) => f.name === name)!);
      expect(targets().length, name).toBeGreaterThan(0);
      expect(undersized(48), name).toEqual([]);
      unmount();
    }
  }, SLOW);
});

describe("without the opt-in nothing changes", () => {
  /** Every computed property of every element in the document, serialised. */
  function computed(): string[] {
    return [...document.body.querySelectorAll("*")].map((el) => {
      const cs = getComputedStyle(el);
      const props: string[] = [];
      for (let i = 0; i < cs.length; i++) props.push(`${cs[i]}:${cs.getPropertyValue(cs[i])}`);
      return `${describeEl(el)} ${props.sort().join(";")}`;
    });
  }

  it("the density block exists, so the comparison below removes something", () => {
    expect(SOURCE).toContain(START);
    expect(SOURCE).toContain(END);
    expect(withoutDensity(SOURCE).length).toBeLessThan(SOURCE.length - 500);
  });

  for (const f of FIXTURES) {
    it(`${f.name}: identical markup and computed style to a sheet with no density rules`, async () => {
      mount(f);
      await installRenderedCss();
      install(withoutDensity(SOURCE));
      const before = { html: document.body.innerHTML, css: computed() };
      install(SOURCE);
      const after = { html: document.body.innerHTML, css: computed() };
      expect(after.html).toBe(before.html);
      expect(after.css).toEqual(before.css);
    }, SLOW);
  }

  it("the opt-in changes style only, never markup", async () => {
    // Two mounts mint two sets of React ids (`«r1»`, `_r_1_`); only those differ.
    const html = () => document.body.innerHTML.replace(/(«r|_r_|:r)[0-9a-z]+(»|_|:)/g, "<id>");
    for (const f of FIXTURES) {
      mount(f);
      const plain = html();
      unmount();
      document.documentElement.setAttribute("data-fancy-density", "touch");
      mount(f);
      expect(html(), f.name).toBe(plain);
      unmount();
      document.documentElement.removeAttribute("data-fancy-density");
    }
  }, SLOW);
});

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

describe("the opt-in is the ONLY switch", () => {
  const block = SOURCE.slice(SOURCE.indexOf(START), SOURCE.indexOf(END)).replace(/\/\*[\s\S]*?\*\//g, "");
  const flat = flatten(block);
  const rules = [...flat.matchAll(/([^{}]+)\{[^{}]*\}/g)].map((m) => m[1].trim()).filter((s) => !s.startsWith("@"));

  it("has rules", () => {
    expect(rules.length).toBeGreaterThan(0);
  });

  it('every density selector starts from [data-fancy-density="touch"]', () => {
    const loose = rules.flatMap(splitSelectors).filter((s) => !s.startsWith('[data-fancy-density="touch"]'));
    expect(loose).toEqual([]);
  });

  it("there is no coarse-pointer query: touch is never applied by default", () => {
    expect(block).not.toMatch(/pointer\s*:\s*coarse/);
  });
});

/**
 * jsdom flattens layers, so the suites above cannot see them. In a browser the
 * layer decides two things, asserted here on the source: the control rules must
 * beat a component's own smaller min-* utility (Pagination's `min-w-9`), so
 * they sit in `utilities` with more specificity than one class; the surface
 * rule must LOSE to a component's own larger minimum (PromptInput's 5.5rem),
 * so it sits in `base`.
 */
describe("the density rules sit in the right layer", () => {
  const block = SOURCE.slice(SOURCE.indexOf(START), SOURCE.indexOf(END)).replace(/\/\*[\s\S]*?\*\//g, "");
  const layer = (name: string) => {
    const at = block.indexOf(`@layer ${name} {`);
    expect(at, `@layer ${name}`).toBeGreaterThanOrEqual(0);
    let depth = 0;
    for (let i = block.indexOf("{", at); i < block.length; i++) {
      if (block[i] === "{") depth++;
      else if (block[i] === "}" && --depth === 0) return block.slice(at, i + 1);
    }
    return "";
  };

  it("controls in utilities, Pagination and Button among them", () => {
    const u = layer("utilities");
    expect(u).toContain("[data-react-fancy-action]");
    expect(u).toContain("[data-react-fancy-pagination]");
    expect(u).toContain('button[role="switch"]');
  });

  it("multi-line surfaces in base, and only there", () => {
    const b = layer("base");
    for (const s of ["[data-react-fancy-prompt-input-textarea]", "[data-react-fancy-editor-content]", "[data-react-fancy-textarea]"]) {
      expect(b).toContain(s);
      expect(layer("utilities")).not.toContain(s);
    }
  });

  it("nothing in the block is unlayered", () => {
    const outside = block.replace(layer("utilities"), "").replace(layer("base"), "");
    expect(outside.trim()).toBe("");
  });
});
