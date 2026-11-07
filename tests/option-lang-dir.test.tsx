// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { Select } from "../src/components/inputs/Select/Select";
import { RadioGroup } from "../src/components/inputs/RadioGroup/RadioGroup";
import { CheckboxGroup } from "../src/components/inputs/CheckboxGroup/CheckboxGroup";
import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";
import { Autocomplete } from "../src/components/Autocomplete/Autocomplete";
import type { InputOption } from "../src/components/inputs/inputs.types";
import { mount, unmountAll } from "./contrast-assert";

/**
 * WCAG 3.1.2 (language of parts): a language switcher names each language in
 * itself, so each option carries its own `lang`, plus `dir` for a right-to-left
 * script inside a left-to-right control (CC-fancy-0014, 6.13.0).
 *
 * The attributes go on the element that holds the option's label text, so the
 * selected-value display (a Select trigger, a view-mode value) carries them
 * too. An option that sets neither renders no attribute at all: `dir="auto"` is
 * available but never added by default, because that would change the output
 * of every existing select.
 */

// Hanifi Rohingya is right-to-left; Burmese and Hindi are left-to-right.
const LANGUAGES: InputOption[] = [
  { value: "en", label: "English" },
  { value: "my", label: "မြန်မာ", lang: "my" },
  { value: "rhg", label: "\u{10D00}\u{10D01}\u{10D02}", lang: "rhg-Rohg", dir: "rtl" },
  { value: "hi", label: "हिन्दी", lang: "hi", dir: "ltr" },
];
const RHG = "\u{10D00}\u{10D01}\u{10D02}";
const MY = "မြန်မာ";

beforeEach(() => {
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = vi.fn();
});
afterEach(() => {
  unmountAll();
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

function click(el: Element | null) {
  act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** The innermost element whose text is exactly `text`. */
function holder(root: ParentNode, text: string): HTMLElement | null {
  const all = [...root.querySelectorAll<HTMLElement>("*")].filter((e) => e.textContent?.trim() === text);
  return all.find((e) => ![...e.children].some((c) => c.textContent?.trim() === text)) ?? null;
}

function attrs(el: Element | null) {
  if (!el) throw new Error("element not found");
  return { lang: el.getAttribute("lang"), dir: el.getAttribute("dir") };
}

describe("native Select", () => {
  it("each <option> carries its own lang and dir; an unset option carries neither", () => {
    const { host } = mount(<Select list={LANGUAGES} />);
    const opts = [...host.querySelectorAll("option")];
    expect(opts.map((o) => attrs(o))).toEqual([
      { lang: null, dir: null },
      { lang: "my", dir: null },
      { lang: "rhg-Rohg", dir: "rtl" },
      { lang: "hi", dir: "ltr" },
    ]);
    // The select itself stays left-to-right: the RTL option does not flip it.
    expect(host.querySelector("select")!.getAttribute("dir")).toBeNull();
  });

  it("options inside an optgroup carry them too", () => {
    const { host } = mount(<Select list={[{ label: "Scripts", options: LANGUAGES }]} />);
    const rhg = [...host.querySelectorAll("option")].find((o) => o.value === "rhg");
    expect(attrs(rhg!)).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
  });

  it("view mode: the selected label carries the option's lang and dir", () => {
    const { host } = mount(<Select mode="view" list={LANGUAGES} value="rhg" />);
    expect(attrs(holder(host, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
  });

  it("view mode: an option without lang adds no attribute and no extra element", () => {
    const { host } = mount(<Select mode="view" list={LANGUAGES} value="en" />);
    const el = holder(host, "English")!;
    expect(attrs(el)).toEqual({ lang: null, dir: null });
    expect(host.querySelector("[lang], [dir]")).toBeNull();
  });
});

describe("listbox Select", () => {
  it("each listbox option's label carries lang and dir, an RTL option in an LTR list", () => {
    const { host } = mount(<Select variant="listbox" list={LANGUAGES} />);
    click(host.querySelector("button"));
    const listbox = document.querySelector('[role="listbox"]')!;
    expect(attrs(holder(listbox, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    expect(attrs(holder(listbox, MY))).toEqual({ lang: "my", dir: null });
    expect(attrs(holder(listbox, "English"))).toEqual({ lang: null, dir: null });
    // Only the label element carries them: the option row keeps the list's direction.
    const row = holder(listbox, RHG)!.closest('[role="option"]')!;
    expect(row.getAttribute("dir")).toBeNull();
  });

  it("the trigger's selected-value label carries the chosen option's lang and dir", () => {
    const { host } = mount(<Select variant="listbox" list={LANGUAGES} value="rhg" onValueChange={() => {}} />);
    const trigger = host.querySelector('[role="combobox"]')!;
    expect(attrs(holder(trigger, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    expect(trigger.getAttribute("dir")).toBeNull();
  });

  it("the trigger follows a pick", () => {
    const { host } = mount(<Select variant="listbox" list={LANGUAGES} />);
    const trigger = host.querySelector('[role="combobox"]')!;
    click(trigger);
    click(holder(document.querySelector('[role="listbox"]')!, MY)!.closest("button"));
    expect(attrs(holder(trigger, MY))).toEqual({ lang: "my", dir: null });
  });

  it("the placeholder and an unset option carry nothing", () => {
    const { host } = mount(<Select variant="listbox" list={LANGUAGES} placeholder="Language" />);
    const trigger = host.querySelector('[role="combobox"]')!;
    expect(attrs(holder(trigger, "Language"))).toEqual({ lang: null, dir: null });
    unmountAll();
    const { host: h2 } = mount(<Select variant="listbox" list={LANGUAGES} value="en" onValueChange={() => {}} />);
    expect(h2.querySelector("[lang], [dir]")).toBeNull();
  });

  it("multiple: one selected label carries it; a count does not", () => {
    const { host } = mount(<Select variant="listbox" multiple list={LANGUAGES} values={["rhg"]} onValuesChange={() => {}} />);
    const trigger = host.querySelector('[role="combobox"]')!;
    expect(attrs(holder(trigger, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    unmountAll();
    const { host: h2 } = mount(
      <Select variant="listbox" multiple list={LANGUAGES} values={["rhg", "my"]} onValuesChange={() => {}} />,
    );
    expect(h2.querySelector('[role="combobox"] [lang], [role="combobox"] [dir]')).toBeNull();
  });

  it("view mode, multiple: each label keeps its own lang and dir", () => {
    const { host } = mount(<Select variant="listbox" multiple mode="view" list={LANGUAGES} values={["en", "rhg", "my"]} />);
    expect(attrs(holder(host, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    expect(attrs(holder(host, MY))).toEqual({ lang: "my", dir: null });
    expect(host.textContent).toContain(`English, ${RHG}, ${MY}`);
  });
});

describe("RadioGroup", () => {
  it("each option's <label> carries lang and dir", () => {
    const { host } = mount(<RadioGroup list={LANGUAGES} />);
    expect(attrs(holder(host, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    expect(holder(host, RHG)!.tagName).toBe("LABEL");
    expect(attrs(holder(host, "English"))).toEqual({ lang: null, dir: null });
  });

  it("view mode carries them on the selected label", () => {
    const { host } = mount(<RadioGroup mode="view" list={LANGUAGES} value="rhg" />);
    expect(attrs(holder(host, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
  });
});

describe("CheckboxGroup", () => {
  it("each option's <label> carries lang and dir", () => {
    const { host } = mount(<CheckboxGroup list={LANGUAGES} />);
    expect(attrs(holder(host, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    expect(attrs(holder(host, MY))).toEqual({ lang: "my", dir: null });
  });

  it("view mode carries them on each selected label", () => {
    const { host } = mount(<CheckboxGroup mode="view" list={LANGUAGES} value={["en", "rhg"]} />);
    expect(attrs(holder(host, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    expect(host.textContent).toContain(`English, ${RHG}`);
  });
});

describe("MultiSwitch", () => {
  it("each segment carries lang and dir", () => {
    const { host } = mount(<MultiSwitch list={LANGUAGES} value="en" onValueChange={() => {}} />);
    expect(attrs(holder(host, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    expect(attrs(holder(host, "English"))).toEqual({ lang: null, dir: null });
  });

  it("view mode carries them on the selected label", () => {
    const { host } = mount(<MultiSwitch mode="view" list={LANGUAGES} value="hi" />);
    expect(attrs(holder(host, "हिन्दी"))).toEqual({ lang: "hi", dir: "ltr" });
  });
});

describe("Autocomplete", () => {
  const OPTIONS = [
    { value: "en", label: "English" },
    { value: "rhg", label: RHG, lang: "rhg-Rohg", dir: "rtl" as const },
  ];

  it("each listbox option carries lang and dir", () => {
    const { host } = mount(<Autocomplete options={OPTIONS} />);
    act(() => host.querySelector("input")!.focus());
    const listbox = document.querySelector('[role="listbox"]')!;
    expect(attrs(holder(listbox, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    expect(attrs(holder(listbox, "English"))).toEqual({ lang: null, dir: null });
  });

  it("the input showing the picked label carries them; picking another clears them", () => {
    const { host } = mount(<Autocomplete options={OPTIONS} />);
    const input = host.querySelector("input")!;
    const pick = (label: string) => {
      // Focus is what opens the list; after a pick the field is still focused.
      act(() => {
        input.blur();
        input.focus();
      });
      click(holder(document.querySelector('[role="listbox"]')!, label)!.closest("button"));
    };
    pick(RHG);
    expect(input.value).toBe(RHG);
    expect(attrs(input)).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
    // The list filters on the field's text: clear it to see every option.
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      set.call(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(attrs(input)).toEqual({ lang: null, dir: null });
    pick("English");
    expect(input.value).toBe("English");
    expect(attrs(input)).toEqual({ lang: null, dir: null });
  });

  it("view mode carries them on the selected label", () => {
    const { host } = mount(<Autocomplete mode="view" options={OPTIONS} value="rhg" />);
    expect(attrs(holder(host, RHG))).toEqual({ lang: "rhg-Rohg", dir: "rtl" });
  });
});
