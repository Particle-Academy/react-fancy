// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { CSSProperties, ReactElement } from "react";
import { THEME_TOKENS } from "../src/theme-tokens";
import { Field, Input, Checkbox, Switch } from "../src/components/inputs";
import { Pillbox } from "../src/components/Pillbox";
import { AA, mount, unmountAll } from "./contrast-assert";
import { contrast } from "./contrast-helper";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * 6.19.0: validation text was hard-coded `text-red-500` with no dark twin.
 * red-500 is 3.81:1 on white, 4.36:1 on #1e1e24 and 3.91:1 on zinc-800, all
 * under WCAG 1.4.3's 4.5:1 for normal text, and `text-xs` is never large text.
 * The error message and the required asterisk now read the `--fancy-error`
 * token: red-600 in light and red-400 in dark by default.
 *
 * Measured through the rendered CSS: the consumer's Tailwind is compiled for
 * the classes in the document, the computed `color` is resolved the way a
 * browser would, and the resulting oklch value goes through the contrast
 * helper. So the claim is about what the browser paints, not a class string.
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
});

const LIGHT_SURFACES = ["white"] as const;
const DARK_SURFACES = ["#1e1e24", "zinc-900", "zinc-800"] as const;

const ERROR = "This field is required.";

/** The innermost element whose own text is exactly `text`. */
function byText(host: Element, text: string): Element {
  const hit = [...host.querySelectorAll("*")].find(
    (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent === text),
  );
  if (!hit) throw new Error(`no element with text "${text}"`);
  return hit;
}

type Case = [label: string, render: () => ReactElement];

const CASES: Case[] = [
  [
    "Field",
    () => (
      <Field label="Name" required error={ERROR}>
        <input />
      </Field>
    ),
  ],
  ["Input (via Field)", () => <Input label="Name" required error={ERROR} />],
  ["Pillbox (via Field)", () => <Pillbox label="Tags" required error={ERROR} />],
  ["Checkbox", () => <Checkbox label="Agree" required error={ERROR} />],
  ["Switch", () => <Switch label="Notify" required error={ERROR} />],
];

function colourOf(el: Element): string {
  const c = resolveVars(el, getComputedStyle(el).getPropertyValue("color"));
  // Guard on the guard: the palette variable really resolved to a colour, so
  // the ratio below is measured and not a parse of an empty string.
  expect(c, "computed colour resolved").toMatch(/^oklch\(/);
  return c;
}

async function render(render: () => ReactElement, dark: boolean) {
  const { host } = mount(<div className={dark ? "dark" : undefined}>{render()}</div>);
  await installRenderedCss();
  return host;
}

describe.each(CASES)("%s", (label, view) => {
  for (const [part, find] of [
    ["error message", (h: Element) => byText(h, ERROR)],
    ["required asterisk", (h: Element) => byText(h, "*")],
  ] as const) {
    it.each(LIGHT_SURFACES)(`${part}, light, on %s: >= 4.5:1`, async (bg) => {
      const host = await render(view, false);
      const fg = colourOf(find(host));
      const r = contrast(fg, bg);
      expect(r, `${label} ${part}: ${fg} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    });

    it.each(DARK_SURFACES)(`${part}, dark, on %s: >= 4.5:1`, async (bg) => {
      const host = await render(view, true);
      const fg = colourOf(find(host));
      const r = contrast(fg, bg);
      expect(r, `${label} ${part}: ${fg} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    });
  }
});

/**
 * CC-fancy-0018 (6.19.0): the colour is a theme token, `--fancy-error` /
 * `--fancy-error-dark`, defaulting to the pair measured above.
 */
describe("the error token pair", () => {
  it("is recorded in THEME_TOKENS with red-600 light and red-400 dark", () => {
    expect(THEME_TOKENS.error).toMatchObject({
      variable: "--fancy-error",
      darkVariable: "--fancy-error-dark",
      light: "var(--color-red-600)",
      dark: "var(--color-red-400)",
    });
  });

  it.each(LIGHT_SURFACES)("the light default clears 4.5:1 on %s", (bg) => {
    const r = contrast(THEME_TOKENS.error.light, bg);
    expect(r, `${THEME_TOKENS.error.light} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });

  it.each(DARK_SURFACES)("the dark default clears 4.5:1 on %s", (bg) => {
    const r = contrast(THEME_TOKENS.error.dark, bg);
    expect(r, `${THEME_TOKENS.error.dark} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });
});

describe.each(CASES)("%s honours a host-set error token", (label, view) => {
  const style = { "--fancy-error": "#9b1c1c", "--fancy-error-dark": "#ffb4a8" } as CSSProperties;

  for (const [part, text] of [
    ["error message", ERROR],
    ["required asterisk", "*"],
  ] as const) {
    it(`${part}, in each mode`, async () => {
      const light = mount(<div style={style}>{view()}</div>).host;
      const dark = mount(
        <div className="dark" style={style}>
          {view()}
        </div>,
      ).host;
      await installRenderedCss();
      const read = (el: Element) => resolveVars(el, getComputedStyle(el).getPropertyValue("color"));
      expect(read(byText(light, text)), `${label}: light`).toBe("#9b1c1c");
      expect(read(byText(dark, text)), `${label}: dark`).toBe("#ffb4a8");
    });
  }
});
