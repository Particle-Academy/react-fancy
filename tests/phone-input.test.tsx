// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PhoneInput, parsePhone, PHONE_COUNTRIES } from "../src/components/PhoneInput";
import type { PhoneInputDetail, PhoneInputProps } from "../src/components/PhoneInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

function mount(el: ReactElement, dir?: "ltr" | "rtl"): HTMLElement {
  const host = document.createElement("div");
  if (dir) host.setAttribute("dir", dir);
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(el));
  return host;
}

afterEach(() => {
  act(() => roots.splice(0).forEach((r) => r.unmount()));
  document.body.innerHTML = "";
});

const number = (h: ParentNode) =>
  h.querySelector<HTMLInputElement>("[data-react-fancy-phone-input-number]")!;
const trigger = () =>
  document.querySelector<HTMLButtonElement>("[data-react-fancy-phone-input-country]")!;
const search = () =>
  document.querySelector<HTMLInputElement>("[data-react-fancy-phone-input-search]");
const options = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-react-fancy-phone-input-option]"));

function type(el: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Types one character at a time, as a person does. */
function typeSlowly(el: HTMLInputElement, text: string) {
  for (let i = 1; i <= text.length; i++) type(el, text.slice(0, i));
}

function press(el: Element, key: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

function blur(el: HTMLElement) {
  act(() => {
    el.focus();
    el.blur();
  });
}

function click(el: Element) {
  act(() => {
    (el as HTMLElement).click();
  });
}

function Harness({
  initial = null,
  onValue,
  ...rest
}: Omit<PhoneInputProps, "value" | "onValueChange"> & {
  initial?: string | null;
  onValue?: (v: string | null, d: PhoneInputDetail) => void;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <PhoneInput
      label="Phone"
      {...rest}
      value={value}
      onValueChange={(v, d) => {
        onValue?.(v, d);
        setValue(v);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// The parser, on its own
// ---------------------------------------------------------------------------

describe("parsePhone", () => {
  it("reads a national number in the selected country, dropping the trunk 0", () => {
    const r = parsePhone("09 4512 3456", { country: "MM" });
    expect(r.value).toBe("+95945123456");
    expect(r).toMatchObject({ country: "MM", dialCode: "95", nationalNumber: "945123456", valid: true, reason: null });
  });

  it.each([
    ["+959 4512 3456"],
    ["00959 4512 3456"],
    ["+95 (9) 4512-3456"],
    ["+95.9.4512.3456"],
    ["  +95 9 4512 3456  "],
  ])("reads the international form %j and picks the country from its dial code", (text) => {
    const r = parsePhone(text, { country: "GB" });
    expect(r.value).toBe("+95945123456");
    expect(r.country).toBe("MM");
  });

  it("never emits an E.164 for partial input in a verified fixed-length plan", () => {
    // Colombia and Cote d'Ivoire are verified rows, both 10 digits.
    for (const [full, country] of [
      ["+57 601 234 5678", null],
      ["+225 07 12 34 56 78", null],
      ["601 234 5678", "CO"],
      ["07 12 34 56 78", "CI"],
    ] as const) {
      for (let i = 1; i < full.length; i++) {
        const r = parsePhone(full.slice(0, i), { country });
        expect(r.value, full.slice(0, i)).toBeNull();
        if (r.reason !== null) expect(r.reason).toBe("too_short");
      }
      expect(parsePhone(full, { country }).value).not.toBeNull();
    }
  });

  it("in a variable-length plan, never emits below the country's shortest number", () => {
    // Myanmar's plan runs 7 to 10 digits, so "+95 945 1234" may be someone's
    // whole number. A length check cannot tell; below 7 digits it never emits.
    const full = "+959 4512 3456";
    for (let i = 1; i < full.length; i++) {
      const r = parsePhone(full.slice(0, i), { country: null });
      if (r.nationalNumber.length < 7) expect(r.value, full.slice(0, i)).toBeNull();
    }
    expect(parsePhone("+959 45", {}).reason).toBe("too_short");
    expect(parsePhone("+", {}).reason).toBe("too_short");
    expect(parsePhone("+9", {}).reason).toBe("too_short");
  });

  it("rejects letters, and does not read past them", () => {
    for (const t of ["+95 9abc", "0911 CALL NOW", "+1 800 FLOWERS", "x", "+95 9 4512 3456 ext 2"]) {
      const r = parsePhone(t, { country: "US" });
      expect(r.value, t).toBeNull();
      expect(r.reason, t).toBe("invalid_chars");
    }
  });

  it("rejects a + anywhere but the start", () => {
    expect(parsePhone("95+9 4512 3456", { country: "MM" }).reason).toBe("invalid_chars");
  });

  it("reports too_long and unknown_country", () => {
    expect(parsePhone("+95 9 4512 3456 7890", {}).reason).toBe("too_long");
    expect(parsePhone("+999 1234 5678", {}).reason).toBe("unknown_country");
    expect(parsePhone("4512 3456", { country: null }).reason).toBe("unknown_country");
    expect(parsePhone("4512 3456", { country: "ZZ" }).reason).toBe("unknown_country");
  });

  it("treats blank as no value, not an error", () => {
    expect(parsePhone("", { country: "MM" })).toMatchObject({ value: null, reason: null, valid: false, nationalNumber: "" });
    expect(parsePhone("  - ", { country: "MM" })).toMatchObject({ value: null, reason: null });
  });

  it("drops a trunk prefix the national plan uses, and keeps Italy's leading 0", () => {
    expect(parsePhone("07911 123456", { country: "GB" }).value).toBe("+447911123456");
    expect(parsePhone("8 495 123-45-67", { country: "RU" }).value).toBe("+74951234567");
    expect(parsePhone("1 (212) 555-0100", { country: "US" }).value).toBe("+12125550100");
    expect(parsePhone("06 1234 5678", { country: "IT" }).value).toBe("+390612345678");
  });

  it("drops the (0) written inside an international number", () => {
    expect(parsePhone("+44 (0)20 7946 0958", {}).value).toBe("+442079460958");
  });

  it("reads digits from other scripts", () => {
    // Arabic-Indic, Extended Arabic-Indic (Persian), Myanmar, fullwidth.
    const arabic = String.fromCodePoint(...[0, 7, 9, 1, 1, 1, 2, 3, 4, 5, 6].map((d) => 0x0660 + d));
    expect(parsePhone(arabic, { country: "GB" }).value).toBe("+447911123456");
    const persian = String.fromCodePoint(...[0, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => 0x06f0 + d));
    expect(parsePhone(persian, { country: "IR" }).value).toBe("+989123456789");
    const myanmar = String.fromCodePoint(...[0, 9, 4, 5, 1, 2, 3, 4, 5, 6].map((d) => 0x1040 + d));
    expect(parsePhone(myanmar, { country: "MM" }).value).toBe("+95945123456");
    expect(parsePhone("＋95 945123456", {}).value).toBe("+95945123456");
  });

  it("ignores the direction marks a right-to-left page wraps around pasted numbers", () => {
    expect(parsePhone("‪+95 9 4512 3456‬", {}).value).toBe("+95945123456");
    expect(parsePhone("‎+95‏ 945123456⁩", {}).value).toBe("+95945123456");
  });

  describe("shared dial codes", () => {
    it("+1: a Canadian area code is CA, a US one is US, and both are marked approximate", () => {
      const ca = parsePhone("+1 416 555 0100", {});
      expect(ca).toMatchObject({ country: "CA", value: "+14165550100", approximate: true });
      const us = parsePhone("+1 212 555 0100", {});
      expect(us).toMatchObject({ country: "US", approximate: true });
      expect(parsePhone("+1 876 555 0100", {}).country).toBe("JM");
    });

    it("keeps the selected country when the hint does not decide", () => {
      expect(parsePhone("+1 212 555 0100", { country: "CA" }).country).toBe("CA");
    });

    it("the E.164 is the same whichever country the hint picks", () => {
      expect(parsePhone("+1 212 555 0100", { country: "CA" }).value).toBe(
        parsePhone("+1 212 555 0100", { country: "US" }).value,
      );
    });

    it("+7, +44, +358 and +262 follow their leading digits", () => {
      expect(parsePhone("+7 701 123 4567", {}).country).toBe("KZ");
      expect(parsePhone("+7 495 123 4567", {}).country).toBe("RU");
      expect(parsePhone("+44 1534 123456", {}).country).toBe("JE");
      expect(parsePhone("+44 20 7946 0958", {}).country).toBe("GB");
      expect(parsePhone("+358 18 12345", {}).country).toBe("AX");
      expect(parsePhone("+262 639 12 34 56", {}).country).toBe("YT");
    });

    it("a dial code no restricted country owns is unknown", () => {
      expect(parsePhone("+44 20 7946 0958", { countries: ["US", "MM"] }).reason).toBe("unknown_country");
    });

    it("is not marked approximate for a dial code one country owns", () => {
      expect(parsePhone("+95 945123456", {}).approximate).toBe(false);
    });
  });

  it("reads a very long input in linear time", () => {
    const started = performance.now();
    parsePhone(`+${"9".repeat(200_000)}x`, {});
    parsePhone(`${" ".repeat(200_000)}a`, { country: "MM" });
    parsePhone("(".repeat(200_000), { country: "MM" });
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe("the country table", () => {
  it("has one well-formed row per country", () => {
    const seen = new Set<string>();
    expect(PHONE_COUNTRIES.length).toBeGreaterThan(200);
    for (const c of PHONE_COUNTRIES) {
      expect(c.code, c.code).toHaveLength(2);
      expect(c.code === c.code.toUpperCase(), c.code).toBe(true);
      expect(seen.has(c.code), `duplicate ${c.code}`).toBe(false);
      seen.add(c.code);
      expect(c.dialCode.length >= 1 && c.dialCode.length <= 3, c.code).toBe(true);
      expect(c.dialCode[0] !== "0", c.code).toBe(true);
      expect(c.minLength <= c.maxLength, c.code).toBe(true);
      expect(c.minLength >= 4, c.code).toBe(true);
      // E.164: at most 15 digits including the country code.
      expect(c.dialCode.length + c.maxLength <= 15, c.code).toBe(true);
    }
  });

  it("verifies lengths only where this session checked a source", () => {
    const verified = PHONE_COUNTRIES.filter((c) => c.lengthVerified).map((c) => c.code).sort();
    expect(verified).toEqual(["BJ", "CI", "CO", "GA", "KZ", "LT", "MM", "SH", "YT"]);
  });

  it("every unverified row accepts any length E.164 allows, and refuses one more", () => {
    // A range written from memory that is too tight refuses a real number and
    // blocks a form; the server validates, so an unverified row must not.
    const unverified = PHONE_COUNTRIES.filter((c) => !c.lengthVerified);
    expect(unverified.length).toBeGreaterThan(200);
    for (const c of unverified) {
      const max = 15 - c.dialCode.length;
      expect([c.minLength, c.maxLength], c.code).toEqual([4, max]);
      // "2" is no country's trunk prefix, so the digits are read as typed.
      const atMax = parsePhone("2".repeat(max), { country: c.code });
      expect(atMax, c.code).toMatchObject({ valid: true, country: c.code, value: `+${c.dialCode}${"2".repeat(max)}` });
      expect(parsePhone("2".repeat(4), { country: c.code }).valid, c.code).toBe(true);
      expect(parsePhone("2".repeat(max + 1), { country: c.code }).reason, c.code).toBe("too_long");
    }
  });

  it("marks each unverified row as such in its source comment", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/PhoneInput/phone-countries.ts"), "utf8");
    for (const c of PHONE_COUNTRIES) {
      const line = source.split("\n").find((l) => l.includes(`["${c.code}",`))!;
      expect(line.includes("UNVERIFIED], //") && line.includes("length UNVERIFIED"), c.code).toBe(!c.lengthVerified);
    }
  });

  it("records a source for every row", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/PhoneInput/phone-countries.ts"), "utf8");
    for (const c of PHONE_COUNTRIES) {
      const line = source.split("\n").find((l) => l.includes(`["${c.code}",`));
      expect(line, c.code).toBeDefined();
      expect(line!.includes("// "), `${c.code} has no source comment`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------

describe("PhoneInput value contract", () => {
  it("renders a labelled tel input that stays left-to-right", () => {
    const h = mount(<Harness defaultCountry="MM" />);
    const input = number(h);
    expect(input.type).toBe("tel");
    expect(input.getAttribute("inputmode")).toBe("tel");
    expect(input.getAttribute("autocomplete")).toBe("tel");
    expect(input.getAttribute("dir")).toBe("ltr");
    const label = h.querySelector(`label[for="${input.id}"]`);
    expect(label?.textContent).toContain("Phone");
    expect(label?.className).not.toContain("sr-only");
  });

  it("emits null with a reason for every partial keystroke, and the E.164 only when it is whole", () => {
    const onValue = vi.fn();
    const h = mount(<Harness defaultCountry="CO" onValue={onValue} />);
    typeSlowly(number(h), "(601) 234-5678");
    const emitted = onValue.mock.calls.map((c) => c[0]);
    expect(emitted.at(-1)).toBe("+576012345678");
    expect(emitted.filter((v) => v !== null)).toEqual(["+576012345678"]);
    const partial = onValue.mock.calls.find((c) => c[0] === null && c[1].nationalNumber !== "")!;
    expect(partial[1]).toMatchObject({ country: "CO", valid: false, reason: "too_short" });
  });

  it("blank is null", () => {
    const onValue = vi.fn();
    const h = mount(<Harness defaultCountry="MM" initial="+95945123456" onValue={onValue} />);
    expect(number(h).value).toBe("945123456");
    type(number(h), "");
    expect(onValue).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: null, nationalNumber: "" }));
  });

  it("pasting an international number selects its country", () => {
    const onValue = vi.fn();
    const h = mount(<Harness defaultCountry="US" onValue={onValue} />);
    type(number(h), "00959 4512 3456");
    expect(onValue).toHaveBeenLastCalledWith("+95945123456", expect.objectContaining({ country: "MM" }));
    expect(trigger().textContent).toContain("+95");
    expect(h.querySelector("[data-react-fancy-phone-input]")!.getAttribute("data-country")).toBe("MM");
  });

  it("letters are refused at once, with a message tied to the input", () => {
    const onValue = vi.fn();
    const h = mount(<Harness defaultCountry="MM" onValue={onValue} />);
    type(number(h), "09 45ab");
    expect(onValue).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: "invalid_chars" }));
    const input = number(h);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const error = h.querySelector("[data-react-fancy-phone-input-error]")!;
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(error.id);
    expect(error.textContent!.length).toBeGreaterThan(10);
  });

  it("too short is reported on blur, not while typing", () => {
    const h = mount(<Harness defaultCountry="MM" />);
    type(number(h), "09 45");
    expect(h.querySelector("[data-react-fancy-phone-input-error]")).toBeNull();
    blur(number(h));
    const error = h.querySelector("[data-react-fancy-phone-input-error]")!;
    expect(error.getAttribute("data-reason")).toBe("too_short");
    expect(number(h).getAttribute("aria-describedby")).toContain(error.id);
  });

  it("each reason has its own readable message, and messages can be replaced", () => {
    const reasons: Record<string, string> = {};
    for (const [text, country] of [
      ["09 45", "MM"],
      ["09 4512 3456 7890", "MM"],
      ["09 45ab", "MM"],
      ["+999 1234", undefined],
    ] as const) {
      const h = mount(<Harness defaultCountry={country} locale="en" />);
      type(number(h), text);
      blur(number(h));
      const e = h.querySelector("[data-react-fancy-phone-input-error]")!;
      reasons[e.getAttribute("data-reason")!] = e.textContent!;
    }
    expect(Object.keys(reasons).sort()).toEqual(["invalid_chars", "too_long", "too_short", "unknown_country"]);
    expect(new Set(Object.values(reasons)).size).toBe(4);
    for (const [code, text] of Object.entries(reasons)) expect(text).not.toContain(code);
    expect(reasons.too_short).toContain("Myanmar");

    const h = mount(<Harness defaultCountry="MM" messages={{ too_short: "Trop court pour {country}." }} locale="fr" />);
    type(number(h), "09 45");
    blur(number(h));
    expect(h.querySelector("[data-react-fancy-phone-input-error]")!.textContent).toMatch(/^Trop court pour /);
  });

  it("a host error wins over the built-in message", () => {
    const h = mount(<Harness defaultCountry="MM" error="Taken already." />);
    const error = h.querySelector("[data-react-fancy-phone-input-error]")!;
    expect(error.textContent).toBe("Taken already.");
    expect(number(h).getAttribute("aria-describedby")).toContain(error.id);
  });

  it("the description is tied to the input as well", () => {
    const h = mount(<Harness defaultCountry="MM" description="We text a code." />);
    const d = Array.from(h.querySelectorAll("p")).find((p) => p.textContent === "We text a code.")!;
    expect(number(h).getAttribute("aria-describedby")).toContain(d.id);
  });

  it("follows a value written from outside, including its country", () => {
    function Outer() {
      const [v, setV] = useState<string | null>(null);
      return (
        <>
          <button type="button" id="set" onClick={() => setV("+14165550100")} />
          <button type="button" id="clear" onClick={() => setV(null)} />
          <PhoneInput label="Phone" value={v} onValueChange={setV} defaultCountry="MM" />
        </>
      );
    }
    const h = mount(<Outer />);
    click(h.querySelector("#set")!);
    expect(number(h).value).toBe("4165550100");
    expect(h.querySelector("[data-react-fancy-phone-input]")!.getAttribute("data-country")).toBe("CA");
    click(h.querySelector("#clear")!);
    expect(number(h).value).toBe("");
  });

  it("posts the E.164 under name, and blocks a form while invalid", () => {
    const h = mount(<Harness defaultCountry="MM" name="phone" />);
    const hidden = h.querySelector<HTMLInputElement>('input[type="hidden"][name="phone"]')!;
    type(number(h), "09 45");
    expect(hidden.value).toBe("");
    expect(number(h).validationMessage).not.toBe("");
    type(number(h), "09 4512 3456");
    expect(hidden.value).toBe("+95945123456");
    expect(number(h).validationMessage).toBe("");
  });

  it("carries stable handles", () => {
    const h = mount(<Harness defaultCountry="MM" />);
    const root = h.querySelector("[data-react-fancy-phone-input]")!;
    type(number(h), "09 4512 3456");
    expect(root.getAttribute("data-valid")).toBe("true");
    type(number(h), "09 45");
    expect(root.getAttribute("data-valid")).toBe("false");
    expect(root.getAttribute("data-reason")).toBe("too_short");
  });
});

describe("PhoneInput country picker", () => {
  it("is a named button that opens a searchable listbox", () => {
    mount(<Harness defaultCountry="MM" locale="en" />);
    const t = trigger();
    expect(t.getAttribute("type")).toBe("button");
    expect(t.getAttribute("aria-haspopup")).toBe("listbox");
    expect(t.getAttribute("aria-expanded")).toBe("false");
    expect(t.getAttribute("aria-label")).toContain("Myanmar");
    expect(t.getAttribute("aria-label")).toContain("+95");
    click(t);
    expect(t.getAttribute("aria-expanded")).toBe("true");
    const s = search()!;
    expect(s.getAttribute("role")).toBe("combobox");
    expect(s.getAttribute("aria-label")).toBeTruthy();
    const listbox = document.getElementById(s.getAttribute("aria-controls")!)!;
    expect(listbox.getAttribute("role")).toBe("listbox");
    expect(options().length).toBeGreaterThan(200);
  });

  it("searches by name, ISO code and dial code, and picks with the keyboard", () => {
    const onValue = vi.fn();
    const h = mount(<Harness defaultCountry="US" locale="en" onValue={onValue} />);
    type(number(h), "09 4512 3456");
    click(trigger());
    type(search()!, "myan");
    expect(options().map((o) => o.getAttribute("data-react-fancy-phone-input-option"))).toEqual(["MM"]);
    type(search()!, "+95");
    expect(options().map((o) => o.getAttribute("data-react-fancy-phone-input-option"))).toContain("MM");
    type(search()!, "mm");
    expect(options()[0].getAttribute("data-react-fancy-phone-input-option")).toBe("MM");

    press(search()!, "ArrowDown");
    expect(search()!.getAttribute("aria-activedescendant")).toBe(options()[0].id);
    press(search()!, "Enter");
    expect(search()).toBeNull();
    expect(onValue).toHaveBeenLastCalledWith("+95945123456", expect.objectContaining({ country: "MM" }));
    expect(document.activeElement).toBe(number(h));
  });

  it("Escape closes the list and returns focus to the picker", () => {
    mount(<Harness defaultCountry="MM" />);
    click(trigger());
    expect(search()).not.toBeNull();
    press(search()!, "Escape");
    expect(search()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("ArrowDown on the closed picker opens it", () => {
    mount(<Harness defaultCountry="MM" />);
    press(trigger(), "ArrowDown");
    expect(search()).not.toBeNull();
  });

  it("countries restricts and orders the list", () => {
    mount(<Harness defaultCountry="MM" countries={["TH", "MM", "LA"]} />);
    click(trigger());
    expect(options().map((o) => o.getAttribute("data-react-fancy-phone-input-option"))).toEqual(["TH", "MM", "LA"]);
  });

  it("names countries in the requested locale", () => {
    mount(<Harness defaultCountry="DE" locale="de" />);
    expect(trigger().getAttribute("aria-label")).toContain("Deutschland");
  });

  it("shows a flag built from regional-indicator letters, hidden from assistive tech", () => {
    mount(<Harness defaultCountry="MM" />);
    const flag = trigger().querySelector("[data-react-fancy-phone-input-flag]")!;
    expect(flag.getAttribute("aria-hidden")).toBe("true");
    expect(Array.from(flag.textContent!).map((c) => c.codePointAt(0))).toEqual([0x1f1f2, 0x1f1f2]);
  });

  it("picking a country while the text is international re-reads it as national", () => {
    const onValue = vi.fn();
    const h = mount(<Harness onValue={onValue} />);
    type(number(h), "+1 212 555 0100");
    expect(onValue).toHaveBeenLastCalledWith("+12125550100", expect.objectContaining({ country: "US" }));
    click(trigger());
    type(search()!, "canada");
    click(options()[0]);
    expect(number(h).value).toBe("2125550100");
    expect(onValue).toHaveBeenLastCalledWith("+12125550100", expect.objectContaining({ country: "CA" }));
  });

  it("targets are at least 44px", () => {
    const h = mount(<Harness defaultCountry="MM" />);
    expect(trigger().className).toContain("min-h-11");
    expect(trigger().className).toContain("min-w-11");
    expect(number(h).className).toContain("min-h-11");
    click(trigger());
    expect(options()[0].className).toContain("min-h-11");
    expect(search()!.className).toContain("min-h-11");
  });
});

describe("PhoneInput under dir=rtl", () => {
  it("keeps the number left-to-right while the picker and label follow the page", () => {
    const h = mount(<Harness defaultCountry="MM" />, "rtl");
    expect(number(h).getAttribute("dir")).toBe("ltr");
    const root = h.querySelector("[data-react-fancy-phone-input]")!;
    expect(root.hasAttribute("dir")).toBe(false);
    expect(trigger().hasAttribute("dir")).toBe(false);
    // The dial code inside the picker is isolated left-to-right too.
    expect(trigger().querySelector('[dir="ltr"]')!.textContent).toBe("+95");
    click(trigger());
    const list = document.querySelector("[data-react-fancy-phone-input-listbox]")!;
    expect(list.closest("[dir]")!.getAttribute("dir")).toBe("rtl");
  });
});
