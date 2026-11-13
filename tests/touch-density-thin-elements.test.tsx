// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";

import { ResizablePanels } from "../src/components/ResizablePanels";
import { Slider } from "../src/components/inputs/Slider";
import { flatten, installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";
import { lengthPx, pseudoBefore, separatorGrab } from "./pseudo-before";
import { contrast, defaultColourOf } from "./contrast-helper";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Touch density and thin interactive elements.
 *
 * Up to 6.24.0 the 44px rule caught the ResizablePanels separator. The
 * separator IS its visible 1px line (its background, hover and focus colour),
 * so under `data-fancy-density="touch"` a side-by-side layout drew a 44px bar,
 * hover and focus coloured all 44px of it, and it covered the neighbouring
 * panel's scrollbar. Stacked panels had the same with min-height.
 *
 * Now the line stays 1px and the transparent `::before` grab area grows to the
 * target across it, placed by `--fancy-separator-grab-start` / `-end`.
 *
 * Measured through the cascade, as the other touch-density suites are: Tailwind
 * compiled for the rendered classes, then `styles.css`. jsdom does not compute
 * pseudo-elements, so `::before` is read through `pseudoBefore` (a mirrored
 * cascade onto a stand-in element; see tests/pseudo-before.ts).
 */

const SLOW = 60_000;
const SOURCE = readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");
const START = "/* fancy-density:start */";
const END = "/* fancy-density:end */";
const withoutDensity = (css: string) => css.slice(0, css.indexOf(START)) + css.slice(css.indexOf(END) + END.length);
const forJsdom = (css: string) => flatten(css.replace(/\/\*[\s\S]*?\*\//g, ""));

let root: Root | null = null;
let sheet: HTMLStyleElement | null = null;

function install(css: string) {
  sheet?.remove();
  sheet = document.createElement("style");
  sheet.textContent = forJsdom(css);
  document.head.append(sheet);
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  sheet?.remove();
  sheet = null;
  removeRenderedCss();
  document.documentElement.removeAttribute("data-fancy-density");
  document.documentElement.removeAttribute("style");
});

type Orientation = "horizontal" | "vertical";

async function mountPanels(orientation: Orientation, { touch = true, css = SOURCE, hostStyle = "" } = {}) {
  if (touch) document.documentElement.setAttribute("data-fancy-density", "touch");
  if (hostStyle) document.documentElement.setAttribute("style", hostStyle);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root!.render(
      <ResizablePanels orientation={orientation} value={30} onValueChange={() => {}} label="Resize">
        <div>One</div>
        <div>Two</div>
      </ResizablePanels>,
    ),
  );
  await installRenderedCss();
  install(css);
  return host.querySelector<HTMLElement>("[data-react-fancy-resizable-panels-separator]")!;
}

/** The separator's own size on an axis: its width / height, raised by its min-*. */
function ownPx(el: Element, axis: "width" | "height"): number {
  const read = (p: string) => {
    const v = lengthPx(resolveVars(el, getComputedStyle(el).getPropertyValue(p)));
    return Number.isFinite(v) ? v : 0;
  };
  return Math.max(read(axis), read(`min-${axis}`));
}

const CASES: { orientation: Orientation; line: "vertical" | "horizontal"; thin: "width" | "height" }[] = [
  { orientation: "horizontal", line: "vertical", thin: "width" },
  { orientation: "vertical", line: "horizontal", thin: "height" },
];

describe('ResizablePanels separator under data-fancy-density="touch"', () => {
  for (const { orientation, line, thin } of CASES) {
    describe(`orientation="${orientation}" (a ${line} line)`, () => {
      it(`the line itself stays 1px ${thin === "width" ? "wide" : "tall"}`, async () => {
        const sep = await mountPanels(orientation);
        expect(sep.getAttribute("aria-orientation")).toBe(line);
        expect(ownPx(sep, thin)).toBe(1);
      }, SLOW);

      it("its ::before grab area is at least 44px across the line, centred on it", async () => {
        const sep = await mountPanels(orientation);
        const g = separatorGrab(sep);
        expect(g.line).toBe(1);
        expect(g.across).toBeGreaterThanOrEqual(44);
        expect(g.start).toBeCloseTo(21.5);
        expect(g.end).toBeCloseTo(21.5);
      }, SLOW);

      it("along the line the separator is a 44px target too", async () => {
        const sep = await mountPanels(orientation);
        expect(ownPx(sep, thin === "width" ? "height" : "width")).toBeGreaterThanOrEqual(44);
      }, SLOW);

      it("--fancy-target-min sizes the grab area", async () => {
        const sep = await mountPanels(orientation, { hostStyle: "--fancy-target-min: 48px" });
        expect(separatorGrab(sep).across).toBeCloseTo(48);
        expect(ownPx(sep, thin)).toBe(1);
      }, SLOW);

      it("--fancy-separator-grab-start / -end place it", async () => {
        const sep = await mountPanels(orientation, {
          hostStyle: "--fancy-separator-grab-start: 4px; --fancy-separator-grab-end: 40px",
        });
        const g = separatorGrab(sep);
        expect(g.start).toBeCloseTo(4);
        expect(g.end).toBeCloseTo(40);
        expect(g.across).toBeCloseTo(45);
      }, SLOW);

      it("the end side grows so the area is never under the target (start 0px, end unset)", async () => {
        const sep = await mountPanels(orientation, { hostStyle: "--fancy-separator-grab-start: 0px" });
        const g = separatorGrab(sep);
        expect(g.start).toBeCloseTo(0);
        expect(g.end).toBeCloseTo(43);
        expect(g.across).toBeCloseTo(44);
      }, SLOW);

      it("...and when both are set too small", async () => {
        const sep = await mountPanels(orientation, {
          hostStyle: "--fancy-separator-grab-start: 2px; --fancy-separator-grab-end: 2px",
        });
        const g = separatorGrab(sep);
        expect(g.start).toBeCloseTo(2);
        expect(g.across).toBeCloseTo(44);
      }, SLOW);

      it("the grab area paints nothing: hover and focus colour only the line", async () => {
        const sep = await mountPanels(orientation);
        const b = pseudoBefore(sep);
        try {
          expect(b.get("background-color")).toMatch(/^(transparent|rgba\(0, 0, 0, 0\))$/);
        } finally {
          b.dispose();
        }
        // The colours are on the separator, which is the 1px line.
        const cls = sep.className;
        expect(cls).toMatch(/(^|\s)hover:bg-/);
        expect(cls).toMatch(/(^|\s)focus-visible:bg-/);
        expect(ownPx(sep, thin)).toBe(1);
      }, SLOW);
    });
  }
});

describe("the separator's focus ring", () => {
  it("is opaque, and the focus colour meets 3:1 on the default surfaces", async () => {
    const sep = await mountPanels("horizontal", { touch: false });
    const cls = sep.className;
    const rings = cls.split(/\s+/).filter((c) => /^(dark:)?focus-visible:ring-\[color:/.test(c));
    expect(rings.length).toBe(2);
    for (const r of rings) expect(r, `${r} is translucent`).not.toMatch(/\/\d+$/);
    const light = defaultColourOf(cls, "", "focus-visible:ring")!;
    const dark = defaultColourOf(cls, "dark:", "focus-visible:ring")!;
    expect(contrast(light, "white")).toBeGreaterThanOrEqual(3);
    expect(contrast(dark, "zinc-900")).toBeGreaterThanOrEqual(3);
  }, SLOW);
});

describe("without the opt-in the separator is unchanged", () => {
  for (const { orientation, thin } of CASES) {
    it(`orientation="${orientation}": the same line and the same 12px grab area, with or without the density rules`, async () => {
      const sep = await mountPanels(orientation, {
        touch: false,
        css: withoutDensity(SOURCE),
        hostStyle: "--fancy-separator-grab-start: 0px; --fancy-separator-grab-end: 40px",
      });
      const before = { line: ownPx(sep, thin), grab: separatorGrab(sep) };
      install(SOURCE);
      const after = { line: ownPx(sep, thin), grab: separatorGrab(sep) };
      expect(after).toEqual(before);
      expect(after.line).toBe(1);
      expect(after.grab).toEqual({ line: 1, start: 6, end: 6, across: 13 });
    }, SLOW);
  }
});

describe("range Slider under the opt-in", () => {
  it("the wrapper grows with its 44px inputs, so the thumbs stay centred on the 6px track", async () => {
    document.documentElement.setAttribute("data-fancy-density", "touch");
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(<Slider range label="Price" defaultValue={[20, 80]} />));
    await installRenderedCss();
    install(SOURCE);
    const inputs = [...host.querySelectorAll<HTMLInputElement>("input[type=range]")];
    expect(inputs.length).toBe(2);
    const wrapper = inputs[0].parentElement!;
    const track = wrapper.firstElementChild!;
    for (const input of inputs) expect(ownPx(input, "height")).toBeGreaterThanOrEqual(44);
    // The inputs sit at the wrapper's top and the track at its middle: same centre
    // only when the wrapper is as tall as the inputs.
    expect(ownPx(wrapper, "height")).toBeGreaterThanOrEqual(44);
    expect(track.className).toMatch(/(^|\s)top-1\/2(\s|$)/);
    expect(ownPx(track, "height")).toBeLessThan(10);
  }, SLOW);
});
