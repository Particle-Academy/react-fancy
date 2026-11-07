// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
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

/**
 * WCAG 1.4.11 (non-text contrast, 3:1) for the RESTING outline of every
 * interactive form control (6.15.0, owner ruling 2026-11-07).
 *
 * The outline is what tells someone where a field is. On the kit's defaults it
 * was the `border` token (zinc-200 on white, 1.27:1; zinc-700 on the #1e1e24
 * field, 1.59:1) or the `border-strong` token at its old defaults (zinc-300,
 * 1.48:1; zinc-700, 1.59:1). Every control below now reads `border-strong`,
 * whose defaults are zinc-500 in both modes.
 *
 * Measured off the rendered classes, for an app that sets no `--fancy-*`
 * variable: the class must name `--fancy-border-strong` (light) and
 * `--fancy-border-strong-dark` (dark), and its fallback must reach 3:1 on the
 * field (`--fancy-input`: white / #1e1e24) and on the page surface
 * (`--fancy-surface`: white / zinc-900), whichever the control sits on.
 *
 * Focus, invalid and disabled styling are not measured here: they keep their
 * own tokens, and a disabled control is exempt from 1.4.11.
 */

afterEach(() => unmountAll());

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

/** Light and dark backgrounds a control's outline can sit against. */
const BACKGROUNDS = {
  light: ["white"],
  dark: ["#1e1e24", "zinc-900"],
} as const;

const STRONG = THEME_TOKENS["border-strong"];

/**
 * The resting outline of `el`, read off its classes: the token each mode reads
 * and that token's fallback. `utility` is `border` for a stroked outline,
 * `ring` for a ring, `bg` for a track whose fill is its only boundary.
 */
function restingOutline(el: Element | null | undefined, utility: "border" | "ring" | "bg" = "border") {
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

function expectStrongOutline(label: string, el: Element | null | undefined, utility: "border" | "ring" | "bg" = "border") {
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

describe("text fields", () => {
  it("Input", () => {
    mount(<Input />);
    expectStrongOutline("Input", q("[data-react-fancy-input] input"));
  });

  it("Input outside affix shares the field's outline", () => {
    mount(<Input prefix="https://" prefixPosition="outside" />);
    expectStrongOutline("Input affix", q("[data-react-fancy-input-wrapper] > span"));
  });

  it("Textarea", () => {
    mount(<Textarea />);
    expectStrongOutline("Textarea", q("[data-react-fancy-textarea]"));
  });

  it("NumberField", () => {
    mount(<NumberField />);
    expectStrongOutline("NumberField", q("[data-react-fancy-number-field] input"));
  });

  it("Autocomplete", () => {
    mount(<Autocomplete options={[{ value: "1", label: "One" }, { value: "2", label: "Two" }]} />);
    expectStrongOutline("Autocomplete", q("[data-react-fancy-autocomplete] input"));
  });

  it("PhoneInput: country trigger and number field", () => {
    const { host } = mount(<PhoneInput label="Phone" />);
    const button = host.querySelector("[role=group] button");
    const input = host.querySelector("[role=group] input");
    expectStrongOutline("PhoneInput country", button);
    expectStrongOutline("PhoneInput number", input);
  });

  it("OtpInput cells", () => {
    mount(<OtpInput length={4} />);
    const cells = document.querySelectorAll("[data-react-fancy-otp-input] input");
    expect(cells.length).toBe(4);
    cells.forEach((cell, i) => expectStrongOutline(`OtpInput cell ${i + 1}`, cell));
  });

  it("Pillbox (tag input)", () => {
    mount(<Pillbox />);
    expectStrongOutline("Pillbox", q("[data-react-fancy-pillbox]"));
  });

  it("EmojiSelect trigger and its search field", () => {
    const { host } = mount(<EmojiSelect />);
    const trigger = host.querySelector("[data-react-fancy-emoji-select] > button");
    expectStrongOutline("EmojiSelect trigger", trigger);
    act(() => (trigger as HTMLButtonElement).click());
    expectStrongOutline("EmojiSelect search", host.querySelector("[data-react-fancy-emoji-select] input[type=text]"));
  });
});

describe("pickers and selects", () => {
  it("Select, native", () => {
    mount(<Select list={["One", "Two"]} />);
    expectStrongOutline("Select native", q("select[data-react-fancy-select]"));
  });

  it("Select, listbox trigger", () => {
    mount(<Select variant="listbox" list={["One", "Two"]} />);
    expectStrongOutline("Select listbox", q('[data-react-fancy-select][data-variant="listbox"]'));
  });

  it("Select, checkbox indicator: the unselected option's check box", () => {
    mount(<Select variant="listbox" multiple indicator="checkbox" list={["One", "Two"]} />);
    act(() => q<HTMLButtonElement>('[data-react-fancy-select][data-variant="listbox"]')!.click());
    const box = document.querySelector('[role="option"][aria-selected="false"] span.rounded.border');
    expectStrongOutline("Select multiple check box", box);
  });

  it("DatePicker", () => {
    mount(<DatePicker />);
    expectStrongOutline("DatePicker", q("[data-react-fancy-date-picker]"));
  });

  it("TimePicker", () => {
    mount(<TimePicker />);
    expectStrongOutline("TimePicker", q("[data-react-fancy-time-picker]"));
  });

  it("ColorPicker swatch (outline variant, the default)", () => {
    mount(<ColorPicker value="#ffffff" />);
    expectStrongOutline("ColorPicker swatch", q("[data-react-fancy-color-picker] > button"), "ring");
  });
});

describe("toggles", () => {
  it("Checkbox", () => {
    mount(<Checkbox label="Agree" />);
    expectStrongOutline("Checkbox", q("[data-react-fancy-checkbox] input"));
  });

  it("CheckboxGroup", () => {
    mount(<CheckboxGroup list={["One", "Two"]} />);
    expectStrongOutline("CheckboxGroup", q("[data-react-fancy-checkbox-group] input"));
  });

  it("RadioGroup", () => {
    mount(<RadioGroup list={["One", "Two"]} />);
    expectStrongOutline("RadioGroup", q("[data-react-fancy-radio-group] input"));
  });

  it("Switch, off: the track is its only boundary", () => {
    mount(<Switch />);
    expectStrongOutline("Switch off track", q('[data-react-fancy-switch] button[role="switch"]'), "bg");
  });

  it("MultiSwitch with no option colour", () => {
    mount(<MultiSwitch list={["One", "Two"]} value="One" />);
    expectStrongOutline("MultiSwitch", q('[data-react-fancy-multi-switch][role="radiogroup"]'));
  });

  it("Slider, range: the unfilled track is its only boundary", () => {
    mount(<Slider range value={[20, 60]} />);
    const track = q("[data-react-fancy-slider] .relative > div");
    expectStrongOutline("Slider range track", track, "bg");
  });
});

describe("file upload", () => {
  it("FileUpload dropzone, idle", () => {
    mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    expectStrongOutline("FileUpload dropzone", q("[data-react-fancy-file-upload-dropzone]"));
  });
});

describe("chat composers: the container is the text field's only boundary", () => {
  it("Composer", () => {
    mount(<Composer />);
    expectStrongOutline("Composer container", q("[data-react-fancy-composer]"));
  });

  it("PromptInput, idle (not dragging)", () => {
    mount(<PromptInput budgetTokens={1000} platform="generic" onSubmit={() => {}} />);
    expectStrongOutline("PromptInput container", q("[data-react-fancy-prompt-input]"));
  });
});
