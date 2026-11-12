// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";

import { Checkbox, CheckboxGroup, RadioGroup, Switch } from "../src/components/inputs";
import { flatten, installRenderedCss, removeRenderedCss } from "./rendered-css";

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
