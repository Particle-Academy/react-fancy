// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";

import { Checkbox, CheckboxGroup, RadioGroup, Switch } from "../src/components/inputs";
import { flatten, installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Touch density, the LABEL ROW (6.22.0 bug). Under `data-fancy-density="touch"`
 * a labelled Switch / Checkbox / Radio row is 44px tall because its control is,
 * but in 6.22.0 two parts of that row did nothing when tapped:
 *   - the `gap-2` between the control and the label column hit the row's div;
 *   - the label was only text-height, so the rest of the label column hit the
 *     column's div, not the `<label>`.
 *
 * jsdom does no layout or hit-testing, so this asserts the CSS that makes the
 * label the hit target for the whole row, read through `getComputedStyle` with
 * Tailwind compiled for the rendered classes plus `styles.css` (the same
 * apparatus as touch-density.test.tsx):
 *   - the row has no column gap, so there is no strip between control and label;
 *   - the label column stretches to the row's height and takes its free width;
 *   - the label grows to fill that column, and starts with the old gap as its
 *     own padding, so the gap is now inside the `<label>`;
 *   - the column's other lines (description, error) keep their old indent.
 * And it proves the label still toggles its control exactly once per click.
 */

const SLOW = 60_000;
const SOURCE = readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");

let root: Root | null = null;
let sheet: HTMLStyleElement | null = null;

async function mount(node: React.ReactElement, touch = true) {
  if (touch) document.documentElement.setAttribute("data-fancy-density", "touch");
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(node));
  await installRenderedCss();
  sheet = document.createElement("style");
  sheet.textContent = flatten(SOURCE.replace(/\/\*[\s\S]*?\*\//g, ""));
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
});

const cs = (el: Element) => getComputedStyle(el);
const remPx = (v: string) => (v.endsWith("rem") ? Number.parseFloat(v) * 16 : Number.parseFloat(v));

/**
 * The row's gap. jsdom keeps the `gap` shorthand unexpanded (Tailwind's
 * `gap-2` reads `calc(var(--spacing) * 2)` and `column-gap` reads `normal`),
 * so the fix sets the shorthand and this reads the shorthand: `0` under the
 * opt-in, the `gap-2` calc otherwise. A single-line flex row has no row gap,
 * so the shorthand is the column gap.
 */
const rowGap = (row: Element) => cs(row).getPropertyValue("gap").trim();
const GAP_2 = "calc(var(--spacing) * 2)";

/** The row is the label's grandparent: row > column > label. */
function assertFullHeightLabel(label: HTMLLabelElement, name: string) {
  const column = label.parentElement!;
  const row = column.parentElement!;
  expect(["0", "0px"], `${name}: row gap (${rowGap(row)})`).toContain(rowGap(row));
  expect(cs(column).alignSelf, `${name}: label column align-self`).toBe("stretch");
  expect(cs(column).flexGrow, `${name}: label column flex-grow`).toBe("1");
  expect(cs(label).flexGrow, `${name}: label flex-grow`).toBe("1");
  expect(remPx(cs(label).paddingInlineStart), `${name}: the gap is the label's own padding`).toBe(8);
  for (const sibling of [...column.children].filter((c) => c !== label)) {
    expect(remPx(cs(sibling).paddingInlineStart), `${name}: ${sibling.textContent} keeps its indent`).toBe(8);
  }
}

describe("touch density: the label fills the labelled row", () => {
  it("Switch: the label is the full-height hit target, the gap inside it", async () => {
    await mount(<Switch label="Notify" description="By email" />);
    const label = document.querySelector<HTMLLabelElement>("[data-react-fancy-switch] label")!;
    assertFullHeightLabel(label, "Switch");
  }, SLOW);

  for (const size of ["xs", "sm", "md", "lg", "xl"] as const) {
    it(`Switch size=${size}`, async () => {
      await mount(<Switch size={size} label="Notify" />);
      assertFullHeightLabel(document.querySelector("[data-react-fancy-switch] label")!, `Switch ${size}`);
    }, SLOW);
  }

  it("Checkbox", async () => {
    await mount(<Checkbox label="Agree" description="Required" />);
    assertFullHeightLabel(document.querySelector("[data-react-fancy-checkbox] label")!, "Checkbox");
  }, SLOW);

  it("CheckboxGroup: every option row", async () => {
    await mount(<CheckboxGroup list={["A", { value: "B", label: "B", description: "Second" }]} />);
    const labels = [...document.querySelectorAll<HTMLLabelElement>("[data-react-fancy-checkbox-group] label")];
    expect(labels.length).toBe(2);
    labels.forEach((l, i) => assertFullHeightLabel(l, `CheckboxGroup option ${i}`));
  }, SLOW);

  it("RadioGroup: every option row", async () => {
    await mount(<RadioGroup list={["Free", "Pro"]} orientation="horizontal" />);
    const labels = [...document.querySelectorAll<HTMLLabelElement>("[data-react-fancy-radio-group] label")];
    expect(labels.length).toBe(2);
    labels.forEach((l, i) => assertFullHeightLabel(l, `RadioGroup option ${i}`));
  }, SLOW);

  it("the control itself is not stretched: a Switch track keeps its size", async () => {
    await mount(<Switch label="Notify" description="By email" />);
    const button = document.querySelector("[data-react-fancy-switch] button[role=switch]")!;
    expect(cs(button).alignSelf).not.toBe("stretch");
    expect(cs(button).flexGrow).toBe("0");
  }, SLOW);

  it("a visually hidden label is not made a hit target (Switch labelHidden)", async () => {
    await mount(<Switch label="Notify" labelHidden description="By email" />);
    const label = document.querySelector("[data-react-fancy-switch] label")!;
    expect(cs(label).flexGrow).toBe("0");
    expect(rowGap(label.parentElement!.parentElement!)).toBe(GAP_2);
  }, SLOW);

  it("without the opt-in the row keeps its gap and the label its text size", async () => {
    await mount(<Switch label="Notify" />, false);
    const label = document.querySelector("[data-react-fancy-switch] label")!;
    expect(rowGap(label.parentElement!.parentElement!)).toBe(GAP_2);
    expect(cs(label).flexGrow).toBe("0");
    expect(remPx(cs(label).paddingInlineStart || "0px")).toBe(0);
  }, SLOW);
});

/**
 * 6.23.x: the CHECKBOX and RADIO look. Under the opt-in the native input was
 * itself sized to 44 x 44, and Chromium and Firefox draw a native checkbox or
 * radio at its box size, so every labelled option showed an oversized glyph
 * with its label top-aligned beside it. In a labelled row the ROW is the
 * target (6.22.1 made the label fill it), so:
 *   - the input keeps its own size (no 44px minimum on it);
 *   - the row, and the label inside it, are at least 44px tall;
 *   - the label's text is vertically centred (flex, align-items: center);
 *   - the input is centred on the label's 44px line: its block-start margin is
 *     (44px - its height) / 2.
 * A row with no visible label (no `label`, or `labelHidden`) has no row to
 * tap, so its input keeps the 44px minimum.
 */
const TARGET = 44;
const SIZE_PX = { xs: 14, sm: 16, md: 18, lg: 20, xl: 24 } as const;

/** A computed length as px: resolves `var()`, then evaluates `calc()` over px and rem. */
function lengthPx(el: Element, raw: string): number {
  const v = resolveVars(el, raw).trim();
  if (v === "" || v === "auto" || v === "none" || v === "normal") return 0;
  const expr = v
    .replace(/calc\(/g, "(")
    .replace(/(-?[\d.]+)rem/g, (_m, n: string) => String(Number(n) * 16))
    .replace(/(-?[\d.]+)px/g, "$1");
  if (!/^[\d.\s()+\-*/]+$/.test(expr)) return Number.NaN;
  return Number(new Function(`return (${expr});`)());
}
const minH = (el: Element) => lengthPx(el, cs(el).getPropertyValue("min-height"));
const minW = (el: Element) => lengthPx(el, cs(el).getPropertyValue("min-width"));

function assertLabelledRow(input: HTMLInputElement, size: keyof typeof SIZE_PX, name: string) {
  const label = [...document.querySelectorAll("label")].find((l) => l.htmlFor === input.id)!;
  expect(label, `${name}: label for the input`).toBeTruthy();
  const row = label.parentElement!.parentElement!;
  expect(row.contains(input), `${name}: the row holds the input`).toBe(true);

  expect(minH(input), `${name}: the input is not drawn at the target size`).toBeLessThan(TARGET);
  expect(minW(input), `${name}: the input is not drawn at the target size`).toBeLessThan(TARGET);

  expect(minH(row), `${name}: the row is the 44px target`).toBe(TARGET);
  expect(minW(row), `${name}: the row is the 44px target`).toBe(TARGET);
  expect(minH(label), `${name}: the label fills a 44px line`).toBe(TARGET);

  expect(cs(label).display, `${name}: label display`).toBe("flex");
  expect(cs(label).alignItems, `${name}: label text is vertically centred`).toBe("center");

  const margin = lengthPx(input, cs(input).getPropertyValue("margin-block-start"));
  expect(margin, `${name}: the input is centred on the 44px line`).toBe((TARGET - SIZE_PX[size]) / 2);
}

describe("touch density: a labelled checkbox or radio keeps its look; the row is the target", () => {
  for (const size of ["xs", "sm", "md", "lg", "xl"] as const) {
    it(`Checkbox size=${size}`, async () => {
      await mount(<Checkbox size={size} label="Agree" />);
      assertLabelledRow(document.querySelector("[data-react-fancy-checkbox] input")!, size, `Checkbox ${size}`);
    }, SLOW);
  }

  it("Checkbox with a description: the label line is still 44px, the input centred on it", async () => {
    await mount(<Checkbox label="Agree" description="Required" />);
    assertLabelledRow(document.querySelector("[data-react-fancy-checkbox] input")!, "md", "Checkbox + description");
  }, SLOW);

  it("CheckboxGroup: every option row", async () => {
    await mount(<CheckboxGroup size="sm" list={["A", { value: "B", label: "B", description: "Second" }]} />);
    const inputs = [...document.querySelectorAll<HTMLInputElement>("[data-react-fancy-checkbox-group] input")];
    expect(inputs.length).toBe(2);
    inputs.forEach((input, i) => assertLabelledRow(input, "sm", `CheckboxGroup option ${i}`));
  }, SLOW);

  for (const size of ["xs", "md", "xl"] as const) {
    it(`RadioGroup size=${size}: every option row`, async () => {
      await mount(<RadioGroup size={size} list={["Free", "Pro"]} orientation="horizontal" />);
      const inputs = [...document.querySelectorAll<HTMLInputElement>("[data-react-fancy-radio-group] input")];
      expect(inputs.length).toBe(2);
      inputs.forEach((input, i) => assertLabelledRow(input, size, `RadioGroup ${size} option ${i}`));
    }, SLOW);
  }

  it("Checkbox labelHidden: the label is for screen readers only and the INPUT is the 44px target", async () => {
    await mount(<Checkbox label="Agree" labelHidden />);
    const root = document.querySelector("[data-react-fancy-checkbox]")!;
    const label = root.querySelector("label")!;
    const input = root.querySelector("input")!;
    expect(label.classList.contains("sr-only"), "labelHidden hides the label visually").toBe(true);
    expect(label.textContent).toBe("Agree");
    expect(label.htmlFor).toBe(input.id);
    expect(root.hasAttribute("labelhidden"), "labelHidden does not leak to the DOM").toBe(false);
    expect(minH(input)).toBe(TARGET);
    expect(minW(input)).toBe(TARGET);
    expect(rowGap(root)).toBe(GAP_2);
  }, SLOW);

  it("Checkbox with no label: the input is the 44px target", async () => {
    await mount(<Checkbox aria-label="Agree" />);
    const input = document.querySelector("[data-react-fancy-checkbox] input")!;
    expect(minH(input)).toBe(TARGET);
    expect(minW(input)).toBe(TARGET);
  }, SLOW);

  it("without the opt-in nothing changes: no minimum, no margin, the label stays inline text", async () => {
    await mount(<Checkbox label="Agree" />, false);
    const input = document.querySelector("[data-react-fancy-checkbox] input")!;
    const label = document.querySelector("[data-react-fancy-checkbox] label")!;
    expect(minH(input)).toBe(0);
    expect(lengthPx(input, cs(input).getPropertyValue("margin-block-start") || "0px")).toBe(0);
    expect(cs(label).display).not.toBe("flex");
  }, SLOW);
});

describe("touch density: a click on the label toggles exactly once", () => {
  it("Switch", async () => {
    const onCheckedChange = vi.fn();
    await mount(<Switch label="Notify" onCheckedChange={onCheckedChange} />);
    const label = document.querySelector<HTMLLabelElement>("[data-react-fancy-switch] label")!;
    const button = document.querySelector("[data-react-fancy-switch] button[role=switch]")!;
    expect(label.htmlFor).toBe(button.id);
    act(() => label.click());
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(button.getAttribute("aria-checked")).toBe("true");
  }, SLOW);

  it("Checkbox", async () => {
    const onCheckedChange = vi.fn();
    await mount(<Checkbox label="Agree" onCheckedChange={onCheckedChange} />);
    act(() => document.querySelector<HTMLLabelElement>("[data-react-fancy-checkbox] label")!.click());
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
  }, SLOW);

  it("CheckboxGroup", async () => {
    const onValueChange = vi.fn();
    await mount(<CheckboxGroup list={["A", "B"]} onValueChange={onValueChange} />);
    act(() => document.querySelectorAll<HTMLLabelElement>("[data-react-fancy-checkbox-group] label")[1].click());
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(["B"]);
  }, SLOW);

  it("RadioGroup", async () => {
    const onValueChange = vi.fn();
    await mount(<RadioGroup list={["Free", "Pro"]} onValueChange={onValueChange} />);
    act(() => document.querySelectorAll<HTMLLabelElement>("[data-react-fancy-radio-group] label")[1].click());
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith("Pro");
  }, SLOW);
});
