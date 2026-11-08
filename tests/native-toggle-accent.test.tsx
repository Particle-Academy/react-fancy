// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { CSSProperties, ReactElement } from "react";
import { THEME_TOKENS } from "../src/theme-tokens";
import { Checkbox, CheckboxGroup, RadioGroup } from "../src/components/inputs";
import { cls, mount, NON_TEXT, unmountAll } from "./contrast-assert";
import { contrast, defaultColourOf } from "./contrast-helper";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * CC-fancy-0015 (6.18.0): the checked colour of the native toggles is a theme
 * token, `--fancy-accent` / `--fancy-accent-dark`. 6.18.1 moved the dark
 * default from blue-600 to blue-500 so it clears 3:1 on dark surfaces.
 *
 * Measured through the rendered CSS rather than the class string: the consumer's
 * Tailwind is compiled for the classes in the document and the computed
 * `accent-color` is resolved the way a browser would, so "default is blue-600"
 * and "a host token is honoured" are claims about what the browser paints.
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
});

const TOGGLES: Array<[label: string, render: () => ReactElement, selector: string]> = [
  ["Checkbox", () => <Checkbox label="Agree" />, "[data-react-fancy-checkbox] input"],
  ["CheckboxGroup", () => <CheckboxGroup list={["One", "Two"]} />, "[data-react-fancy-checkbox-group] input"],
  ["RadioGroup", () => <RadioGroup list={["One", "Two"]} />, "[data-react-fancy-radio-group] input"],
];

function accentOf(el: Element): string {
  return resolveVars(el, getComputedStyle(el).getPropertyValue("accent-color"));
}

function place(render: () => ReactElement, selector: string, opts: { dark?: boolean; style?: CSSProperties }) {
  const { host } = mount(
    <div className={opts.dark ? "dark" : undefined} style={opts.style}>
      {render()}
    </div>,
  );
  const el = host.querySelector(selector);
  if (!el) throw new Error(`${selector}: not found`);
  return el;
}

describe("the accent token pair", () => {
  it("is recorded in THEME_TOKENS with blue-600 light and blue-500 dark", () => {
    expect(THEME_TOKENS.accent).toMatchObject({
      variable: "--fancy-accent",
      darkVariable: "--fancy-accent-dark",
      light: "var(--color-blue-600)",
      dark: "var(--color-blue-500)",
    });
  });
});

/**
 * 6.18.1: the dark default was blue-600, which falls under WCAG 1.4.11's 3:1
 * on the kit's own dark surfaces (zinc-800 is the dark card and popover). The
 * ratios come from the palette's real oklch values via the contrast helper,
 * for both the THEME_TOKENS record and the fallback each component ships.
 */
const DARK_SURFACES = ["#1e1e24", "zinc-900", "zinc-800"] as const;

describe("the accent default clears 3:1 (WCAG 1.4.11)", () => {
  const sources: Array<[string, { light: string | null; dark: string | null }]> = [
    ["THEME_TOKENS", { light: THEME_TOKENS.accent.light, dark: THEME_TOKENS.accent.dark }],
    ...TOGGLES.map(([label, render, selector]): [string, { light: string | null; dark: string | null }] => [
      label,
      {
        light: defaultColourOf(cls(place(render, selector, {})), "", "accent"),
        dark: defaultColourOf(cls(place(render, selector, { dark: true })), "dark:", "accent"),
      },
    ]),
  ];
  unmountAll();

  describe.each(sources)("%s", (label, defaults) => {
    it.each(DARK_SURFACES)("dark default on %s", (bg) => {
      expect(defaults.dark, `${label}: dark default found`).not.toBeNull();
      const r = contrast(defaults.dark!, bg);
      expect(r, `${label}: ${defaults.dark} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(NON_TEXT);
    });

    it("light default on white", () => {
      expect(defaults.light, `${label}: light default found`).not.toBeNull();
      const r = contrast(defaults.light!, "white");
      expect(r, `${label}: ${defaults.light} on white = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(NON_TEXT);
    });
  });
});

describe.each(TOGGLES)("%s accent-color", (label, render, selector) => {
  it("defaults to blue-600 in light and blue-500 in dark", async () => {
    const light = place(render, selector, {});
    const dark = place(render, selector, { dark: true });
    await installRenderedCss();
    const blue600 = resolveVars(light, "var(--color-blue-600)");
    const blue500 = resolveVars(light, "var(--color-blue-500)");
    // Guard on the guard: the palette variables really resolved to colours.
    expect(blue600, "blue-600 resolved").toMatch(/^oklch\(/);
    expect(blue500, "blue-500 resolved").toMatch(/^oklch\(/);
    expect(accentOf(light), `${label}: light`).toBe(blue600);
    expect(accentOf(dark), `${label}: dark`).toBe(blue500);
  });

  it("honours a host-set token in each mode", async () => {
    const style = { "--fancy-accent": "#c2603d", "--fancy-accent-dark": "#7fb0e0" } as CSSProperties;
    const light = place(render, selector, { style });
    const dark = place(render, selector, { dark: true, style });
    await installRenderedCss();
    expect(accentOf(light), `${label}: light`).toBe("#c2603d");
    expect(accentOf(dark), `${label}: dark`).toBe("#7fb0e0");
  });
});
