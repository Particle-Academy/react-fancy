// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { THEME_TOKENS } from "../src/theme-tokens";
import { Input, Textarea, Select, Checkbox, CheckboxGroup, RadioGroup, Switch, Slider, NumberField, MultiSwitch, DatePicker } from "../src/components/inputs";
import { Autocomplete } from "../src/components/Autocomplete";
import { PhoneInput } from "../src/components/PhoneInput";
import { OtpInput } from "../src/components/OtpInput";
import { Pillbox } from "../src/components/Pillbox/Pillbox";
import { TimePicker } from "../src/components/TimePicker";
import { ColorPicker } from "../src/components/ColorPicker";
import { EmojiSelect } from "../src/components/EmojiSelect";
import { FileUpload } from "../src/components/FileUpload";
import { Composer } from "../src/components/Composer";
import { PromptInput } from "../src/components/PromptInput";
import { contrast } from "./contrast-helper";
import { cls, mount, unmountAll, NON_TEXT } from "./contrast-assert";
import { installRenderedCss, removeRenderedCss } from "./rendered-css";

/**
 * WCAG 1.4.11 (non-text contrast, 3:1) for the RESTING outline of every
 * interactive form control (6.15.0, owner ruling 2026-11-07).
 *
 * The outline is what tells someone where a field is. On the kit's defaults it
 * was the `border` token (zinc-200 on white, 1.27:1; zinc-700 on the #1e1e24
 * field, 1.59:1) or the `border-strong` token at its old defaults (zinc-300,
 * 1.48:1; zinc-700, 1.59:1). Every drawn control below reads `border-strong`,
 * whose defaults are zinc-500 in both modes.
 *
 * Two layers of check, because 6.15.0 had only the first:
 *  1. The class names `--fancy-border-strong` (light) and
 *     `--fancy-border-strong-dark` (dark), and that token's fallback reaches
 *     3:1 on the field (`--fancy-input`: white / #1e1e24) and on the page
 *     surface (`--fancy-surface`: white / zinc-900).
 *  2. (6.15.1) The outline RENDERS: the consumer's Tailwind is compiled for the
 *     classes in the document and installed, and the computed border width is
 *     read. A colour class with no width is no outline. 6.15.0 asserted a class
 *     on native checkboxes and radios, which the browser draws itself and whose
 *     author border it ignores; the class was there and did nothing.
 *
 * Native checkboxes and radios are measured as native controls instead: no
 * border classes at all, the kit's checked colour as `accent-color`, and
 * `color-scheme: dark` in dark mode so the browser draws its dark box.
 *
 * Focus, invalid and disabled styling are not measured here: they keep their
 * own tokens, and a disabled control is exempt from 1.4.11.
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
});

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

/** Light and dark backgrounds a control's outline can sit against. */
const BACKGROUNDS = {
  light: ["white"],
  dark: ["#1e1e24", "zinc-900"],
} as const;

const STRONG = THEME_TOKENS["border-strong"];

type Utility = "border" | "ring" | "bg";

/**
 * The resting outline of `el`, read off its classes: the token each mode reads
 * and that token's fallback. `utility` is `border` for a stroked outline,
 * `ring` for a ring, `bg` for a track whose fill is its only boundary.
 */
function restingOutline(el: Element | null | undefined, utility: Utility = "border") {
  if (!el) throw new Error("restingOutline: element not found");
  const c = cls(el);
  const read = (prefix: "" | "dark:") => {
    for (const token of c.split(/\s+/)) {
      if (!token.startsWith(prefix + utility + "-[color:var(")) continue;
      const m = token.slice(prefix.length).match(/^[a-z]+-\[color:var\((--fancy-[a-z-]+),(.+)\)\]$/);
      if (m) return { variable: m[1], fallback: m[2] };
    }
    return null;
  };
  return { light: read(""), dark: read("dark:"), cls: c };
}

const SIDES = ["Top", "Right", "Bottom", "Left"] as const;

/** Widest computed border side, in px. A side whose style is none draws nothing. */
function renderedBorderPx(el: Element): number {
  const cs = getComputedStyle(el) as unknown as Record<string, string>;
  let widest = 0;
  for (const s of SIDES) {
    const style = cs[`border${s}Style`];
    if (!style || style === "none" || style === "hidden") continue;
    const m = (cs[`border${s}Width`] ?? "").match(/^([\d.]+)px$/);
    if (m) widest = Math.max(widest, Number(m[1]));
  }
  return widest;
}

/** What the outline actually paints, for the utility the test names. */
function rendersOutline(el: Element, utility: Utility): { ok: boolean; seen: string } {
  const cs = getComputedStyle(el);
  if (utility === "border") {
    const px = renderedBorderPx(el);
    return { ok: px > 0, seen: `border ${px}px` };
  }
  if (utility === "ring") {
    const shadow = cs.boxShadow;
    return { ok: !!shadow && shadow !== "none", seen: `box-shadow ${shadow || "(none)"}` };
  }
  const bg = cs.backgroundColor;
  return { ok: !!bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)", seen: `background ${bg || "(none)"}` };
}

const isNative = (el: Element) =>
  el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");

async function expectStrongOutline(label: string, el: Element | null | undefined, utility: Utility = "border") {
  if (!el) throw new Error(`${label}: element not found`);
  expect(isNative(el), `${label}: a native checkbox/radio is drawn by the browser; use expectNativeToggle`).toBe(false);
  const o = restingOutline(el, utility);
  expect(o.light?.variable, `${label}: light outline token in "${o.cls}"`).toBe(STRONG.variable);
  expect(o.dark?.variable, `${label}: dark outline token in "${o.cls}"`).toBe(STRONG.darkVariable);
  for (const mode of ["light", "dark"] as const) {
    const fallback = o[mode]!.fallback;
    for (const bg of BACKGROUNDS[mode]) {
      const ratio = contrast(fallback, bg);
      expect(ratio, `${label} (${mode}): ${fallback} on ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(NON_TEXT);
    }
  }
  await installRenderedCss();
  const r = rendersOutline(el, utility);
  expect(r.ok, `${label}: the outline must render; computed ${r.seen} on "${o.cls}"`).toBe(true);
}

/** The kit's checked / selected colour for native toggles (Slider's `accent-blue-600`). */
const CHECKED_ACCENT = "var(--color-blue-600)";

/**
 * A native checkbox or radio: the browser draws the box, so the kit themes what
 * the browser exposes and claims nothing else.
 */
async function expectNativeToggle(label: string, render: () => ReactElement, selector: string) {
  const light = mount(render());
  const darkWrap = mount(<div className="dark">{render()}</div>);
  const lightEl = light.host.querySelector(selector);
  const darkEl = darkWrap.host.querySelector(selector);
  if (!lightEl || !darkEl) throw new Error(`${label}: element not found`);
  expect(isNative(lightEl), `${label} is a native toggle`).toBe(true);

  const c = cls(lightEl);
  const borderClasses = c.split(/\s+/).filter((t) => /^(dark:)?border(-|$)/.test(t));
  expect(borderClasses, `${label}: border classes on a native toggle paint nothing`).toEqual([]);

  await installRenderedCss();
  expect(renderedBorderPx(lightEl), `${label}: no author border on a native toggle`).toBe(0);
  expect(getComputedStyle(lightEl).getPropertyValue("accent-color").trim(), `${label}: checked colour`).toBe(CHECKED_ACCENT);
  expect(getComputedStyle(darkEl).getPropertyValue("accent-color").trim(), `${label}: checked colour, dark`).toBe(CHECKED_ACCENT);
  expect(getComputedStyle(lightEl).getPropertyValue("color-scheme").trim() || "normal", `${label}: light scheme`).toBe("normal");
  expect(getComputedStyle(darkEl).getPropertyValue("color-scheme").trim(), `${label}: dark scheme`).toBe("dark");
}

describe("border-strong token defaults (WCAG 1.4.11)", () => {
  it("are zinc-500 in both modes", () => {
    expect(STRONG.light).toBe("var(--color-zinc-500)");
    expect(STRONG.dark).toBe("var(--color-zinc-500)");
  });

  it("reach 3:1 against the field background, light and dark", () => {
    const light = contrast(STRONG.light, THEME_TOKENS.input.light);
    const dark = contrast(STRONG.dark, THEME_TOKENS.input.dark);
    expect(light, `light: ${light.toFixed(2)}:1`).toBeGreaterThanOrEqual(NON_TEXT);
    expect(dark, `dark: ${dark.toFixed(2)}:1`).toBeGreaterThanOrEqual(NON_TEXT);
    // And on the page surface, for controls with no field fill of their own.
    expect(contrast(STRONG.light, THEME_TOKENS.surface.light)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(contrast(STRONG.dark, THEME_TOKENS.surface.dark)).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe("the rendered-CSS instrument discriminates", () => {
  // Guard on the guard: a measurement that reads every element as bordered
  // would pass every check below.
  it("reads a colour class with no width as no border, and `border` as 1px", async () => {
    const { host } = mount(
      <div>
        <span data-x="colour-only" className="border-[color:var(--fancy-border-strong,var(--color-zinc-500))]" />
        <span data-x="drawn" className="border border-[color:var(--fancy-border-strong,var(--color-zinc-500))]" />
      </div>,
    );
    await installRenderedCss();
    expect(renderedBorderPx(host.querySelector('[data-x="colour-only"]')!)).toBe(0);
    expect(renderedBorderPx(host.querySelector('[data-x="drawn"]')!)).toBe(1);
  });
});

describe("text fields", () => {
  it("Input", async () => {
    mount(<Input />);
    await expectStrongOutline("Input", q("[data-react-fancy-input] input"));
  });

  it("Input outside affix shares the field's outline", async () => {
    mount(<Input prefix="https://" prefixPosition="outside" />);
    await expectStrongOutline("Input affix", q("[data-react-fancy-input-wrapper] > span"));
  });

  it("Textarea", async () => {
    mount(<Textarea />);
    await expectStrongOutline("Textarea", q("[data-react-fancy-textarea]"));
  });

  it("NumberField", async () => {
    mount(<NumberField />);
    await expectStrongOutline("NumberField", q("[data-react-fancy-number-field] input"));
  });

  it("Autocomplete", async () => {
    mount(<Autocomplete options={[{ value: "1", label: "One" }, { value: "2", label: "Two" }]} />);
    await expectStrongOutline("Autocomplete", q("[data-react-fancy-autocomplete] input"));
  });

  it("PhoneInput: country trigger and number field", async () => {
    const { host } = mount(<PhoneInput label="Phone" />);
    await expectStrongOutline("PhoneInput country", host.querySelector("[role=group] button"));
    await expectStrongOutline("PhoneInput number", host.querySelector("[role=group] input"));
  });

  it("OtpInput cells", async () => {
    mount(<OtpInput length={4} />);
    const cells = [...document.querySelectorAll("[data-react-fancy-otp-input] input")];
    expect(cells.length).toBe(4);
    for (const [i, cell] of cells.entries()) await expectStrongOutline(`OtpInput cell ${i + 1}`, cell);
  });

  it("Pillbox (tag input)", async () => {
    mount(<Pillbox />);
    await expectStrongOutline("Pillbox", q("[data-react-fancy-pillbox]"));
  });

  it("EmojiSelect trigger and its search field", async () => {
    const { host } = mount(<EmojiSelect />);
    const trigger = host.querySelector("[data-react-fancy-emoji-select] > button");
    await expectStrongOutline("EmojiSelect trigger", trigger);
    act(() => (trigger as HTMLButtonElement).click());
    await expectStrongOutline("EmojiSelect search", host.querySelector("[data-react-fancy-emoji-select] input[type=text]"));
  });
});

describe("pickers and selects", () => {
  it("Select, native", async () => {
    mount(<Select list={["One", "Two"]} />);
    await expectStrongOutline("Select native", q("select[data-react-fancy-select]"));
  });

  it("Select, listbox trigger", async () => {
    mount(<Select variant="listbox" list={["One", "Two"]} />);
    await expectStrongOutline("Select listbox", q('[data-react-fancy-select][data-variant="listbox"]'));
  });

  it("Select, checkbox indicator: the unselected option's check box", async () => {
    mount(<Select variant="listbox" multiple indicator="checkbox" list={["One", "Two"]} />);
    act(() => q<HTMLButtonElement>('[data-react-fancy-select][data-variant="listbox"]')!.click());
    const box = document.querySelector('[role="option"][aria-selected="false"] span.rounded.border');
    await expectStrongOutline("Select multiple check box", box);
  });

  it("DatePicker", async () => {
    mount(<DatePicker />);
    await expectStrongOutline("DatePicker", q("[data-react-fancy-date-picker]"));
  });

  it("TimePicker", async () => {
    mount(<TimePicker />);
    await expectStrongOutline("TimePicker", q("[data-react-fancy-time-picker]"));
  });

  it("ColorPicker swatch (outline variant, the default)", async () => {
    mount(<ColorPicker value="#ffffff" />);
    await expectStrongOutline("ColorPicker swatch", q("[data-react-fancy-color-picker] > button"), "ring");
  });
});

describe("native toggles: drawn by the browser, themed through what it exposes", () => {
  it("Checkbox", async () => {
    await expectNativeToggle("Checkbox", () => <Checkbox label="Agree" />, "[data-react-fancy-checkbox] input");
  });

  it("CheckboxGroup", async () => {
    await expectNativeToggle("CheckboxGroup", () => <CheckboxGroup list={["One", "Two"]} />, "[data-react-fancy-checkbox-group] input");
  });

  it("RadioGroup", async () => {
    await expectNativeToggle("RadioGroup", () => <RadioGroup list={["One", "Two"]} />, "[data-react-fancy-radio-group] input");
  });
});

describe("drawn toggles", () => {
  it("Switch, off: the track is its only boundary", async () => {
    mount(<Switch />);
    await expectStrongOutline("Switch off track", q('[data-react-fancy-switch] button[role="switch"]'), "bg");
  });

  it("MultiSwitch with no option colour", async () => {
    mount(<MultiSwitch list={["One", "Two"]} value="One" />);
    await expectStrongOutline("MultiSwitch", q('[data-react-fancy-multi-switch][role="radiogroup"]'));
  });

  it("Slider, range: the unfilled track is its only boundary", async () => {
    mount(<Slider range value={[20, 60]} />);
    await expectStrongOutline("Slider range track", q("[data-react-fancy-slider] .relative > div"), "bg");
  });
});

describe("file upload", () => {
  it("FileUpload dropzone, idle", async () => {
    mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    await expectStrongOutline("FileUpload dropzone", q("[data-react-fancy-file-upload-dropzone]"));
  });
});

describe("chat composers: the container is the text field's only boundary", () => {
  it("Composer", async () => {
    mount(<Composer />);
    await expectStrongOutline("Composer container", q("[data-react-fancy-composer]"));
  });

  it("PromptInput, idle (not dragging)", async () => {
    mount(<PromptInput budgetTokens={1000} platform="generic" onSubmit={() => {}} />);
    await expectStrongOutline("PromptInput container", q("[data-react-fancy-prompt-input]"));
  });
});

/**
 * The inventory, measured the same way: every element inside these controls
 * that carries a resting border COLOUR class must render a border, or the
 * class is dead markup claiming an outline that is not there.
 */
describe("no dead border classes inside the 6.15.0 controls", () => {
  const CONTROLS: Array<[string, () => ReactElement]> = [
    ["Input", () => <Input prefix="https://" prefixPosition="outside" />],
    ["Textarea", () => <Textarea />],
    ["NumberField", () => <NumberField />],
    ["Autocomplete", () => <Autocomplete options={[{ value: "1", label: "One" }]} />],
    ["PhoneInput", () => <PhoneInput label="Phone" />],
    ["OtpInput", () => <OtpInput length={4} />],
    ["Pillbox", () => <Pillbox />],
    ["EmojiSelect", () => <EmojiSelect />],
    ["Select", () => <Select list={["One"]} />],
    ["Select listbox", () => <Select variant="listbox" list={["One"]} />],
    ["DatePicker", () => <DatePicker />],
    ["TimePicker", () => <TimePicker />],
    ["ColorPicker", () => <ColorPicker value="#ffffff" />],
    ["Checkbox", () => <Checkbox label="Agree" />],
    ["CheckboxGroup", () => <CheckboxGroup list={["One", "Two"]} />],
    ["RadioGroup", () => <RadioGroup list={["One", "Two"]} />],
    ["Switch", () => <Switch />],
    ["MultiSwitch", () => <MultiSwitch list={["One", "Two"]} value="One" />],
    ["Slider", () => <Slider range value={[20, 60]} />],
    ["FileUpload", () => (
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>
    )],
    ["Composer", () => <Composer />],
    ["PromptInput", () => <PromptInput budgetTokens={1000} platform="generic" onSubmit={() => {}} />],
  ];

  it("every resting border colour class paints a border", async () => {
    const hosts = CONTROLS.map(([name, render]) => [name, mount(render()).host] as const);
    await installRenderedCss();
    const dead: string[] = [];
    for (const [name, host] of hosts) {
      host.querySelectorAll("[class]").forEach((el) => {
        const colour = cls(el)
          .split(/\s+/)
          .find((t) => /^border-(\[color:|(zinc|gray|slate|neutral|stone)-\d)/.test(t));
        if (!colour) return;
        if (isNative(el) || renderedBorderPx(el) === 0) dead.push(`${name}: <${el.tagName.toLowerCase()}${isNative(el) ? ` type=${(el as HTMLInputElement).type}` : ""}> ${colour}`);
      });
    }
    expect(dead).toEqual([]);
  });
});
