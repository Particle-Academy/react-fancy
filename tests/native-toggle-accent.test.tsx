// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { CSSProperties, ReactElement } from "react";
import { THEME_TOKENS } from "../src/theme-tokens";
import { Checkbox, CheckboxGroup, RadioGroup } from "../src/components/inputs";
import { mount, unmountAll } from "./contrast-assert";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * CC-fancy-0015 (6.18.0): the checked colour of the native toggles is a theme
 * token, `--fancy-accent` / `--fancy-accent-dark`, both defaulting to blue-600.
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
  it("is recorded in THEME_TOKENS with blue-600 in both modes", () => {
    expect(THEME_TOKENS.accent).toMatchObject({
      variable: "--fancy-accent",
      darkVariable: "--fancy-accent-dark",
      light: "var(--color-blue-600)",
      dark: "var(--color-blue-600)",
    });
  });
});

describe.each(TOGGLES)("%s accent-color", (label, render, selector) => {
  it("defaults to blue-600 in light and dark", async () => {
    const light = place(render, selector, {});
    const dark = place(render, selector, { dark: true });
    await installRenderedCss();
    const blue = resolveVars(light, "var(--color-blue-600)");
    // Guard on the guard: the palette variable really resolved to a colour.
    expect(blue, "blue-600 resolved").toMatch(/^oklch\(/);
    expect(accentOf(light), `${label}: light`).toBe(blue);
    expect(accentOf(dark), `${label}: dark`).toBe(blue);
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
