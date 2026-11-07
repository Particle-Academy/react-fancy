// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OtpInput } from "../src/components/OtpInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * OtpInput, 6.14.0: SMS autofill, a whole code arriving in one cell, and the
 * group's accessible name. Each block below failed on 6.13.0.
 */

const roots: Root[] = [];

function mount(el: ReactElement, dir?: "ltr" | "rtl") {
  const host = document.createElement("div");
  if (dir) host.setAttribute("dir", dir);
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(el));
  return host;
}

afterEach(() => {
  for (const r of roots.splice(0)) act(() => r.unmount());
  document.body.innerHTML = "";
});

const cells = (host: HTMLElement) => [...host.querySelectorAll<HTMLInputElement>("[data-react-fancy-otp-input] input")];

/** What the browser does when text lands in a field: set the value natively, fire `input`. */
function typeInto(el: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function key(el: Element, k: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

function Controlled({ initial = "", length = 6, spy }: { initial?: string; length?: number; spy?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <OtpInput
      length={length}
      value={value}
      onChange={(v) => {
        spy?.(v);
        setValue(v);
      }}
    />
  );
}

describe("SMS autofill", () => {
  it("marks the first cell one-time-code and the others off", () => {
    const host = mount(<OtpInput length={4} />);
    const c = cells(host);
    expect(c[0].getAttribute("autocomplete")).toBe("one-time-code");
    expect(c.slice(1).map((el) => el.getAttribute("autocomplete"))).toEqual(["off", "off", "off"]);
  });
});

describe("several digits arriving in one cell", () => {
  it("lets the browser deliver a whole code: no maxLength under the code length", () => {
    const host = mount(<OtpInput length={6} />);
    for (const el of cells(host)) {
      const max = el.getAttribute("maxlength");
      expect(max === null || Number(max) >= 6).toBe(true);
    }
  });

  it("spreads an autofilled code across every cell and focuses the last", () => {
    const spy = vi.fn();
    const host = mount(<Controlled spy={spy} />);
    const c = cells(host);
    act(() => c[0].focus());

    typeInto(c[0], "123456");

    expect(spy).toHaveBeenLastCalledWith("123456");
    expect(cells(host).map((el) => el.value)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(document.activeElement).toBe(cells(host)[5]);
  });

  it("spreads from the cell it lands in, keeps earlier digits, and focuses the next empty cell", () => {
    const spy = vi.fn();
    const host = mount(<Controlled initial="12" spy={spy} />);
    const c = cells(host);
    act(() => c[2].focus());

    typeInto(c[2], "45");

    expect(spy).toHaveBeenLastCalledWith("1245");
    expect(cells(host).map((el) => el.value)).toEqual(["1", "2", "4", "5", "", ""]);
    expect(document.activeElement).toBe(cells(host)[4]);
  });

  it("drops what does not fit and ignores non-digits", () => {
    const spy = vi.fn();
    const host = mount(<Controlled length={4} spy={spy} />);
    typeInto(cells(host)[1], "9-8 7x65");
    expect(spy).toHaveBeenLastCalledWith(" 987");
    expect(document.activeElement).toBe(cells(host)[3]);
  });

  it("typing one digit into a filled cell replaces it rather than spilling into the next", () => {
    const spy = vi.fn();
    const host = mount(<Controlled initial="5" spy={spy} />);
    // Caret after the existing digit: the field now reads "53".
    typeInto(cells(host)[0], "53");
    expect(spy).toHaveBeenLastCalledWith("3");
    expect(document.activeElement).toBe(cells(host)[1]);
  });

  it("a single digit still advances one cell", () => {
    const spy = vi.fn();
    const host = mount(<Controlled spy={spy} />);
    typeInto(cells(host)[0], "7");
    expect(spy).toHaveBeenLastCalledWith("7");
    expect(document.activeElement).toBe(cells(host)[1]);
  });
});

describe("names", () => {
  it("wraps the cells in a group named Verification code by default", () => {
    const host = mount(<OtpInput length={4} />);
    const group = host.querySelector('[role="group"]')!;
    expect(group).not.toBeNull();
    expect(group.getAttribute("aria-label")).toBe("Verification code");
    expect(cells(host).every((el) => group.contains(el))).toBe(true);
  });

  it("takes the group name from label", () => {
    const host = mount(<OtpInput length={4} label="Code from your text message" />);
    expect(host.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe("Code from your text message");
  });

  it("uses aria-labelledby instead of a label when given", () => {
    const host = mount(<OtpInput length={4} aria-labelledby="otp-heading" />);
    const group = host.querySelector('[role="group"]')!;
    expect(group.getAttribute("aria-labelledby")).toBe("otp-heading");
    expect(group.hasAttribute("aria-label")).toBe(false);
  });

  it("names each cell Digit n of total by default", () => {
    const host = mount(<OtpInput length={4} />);
    expect(cells(host).map((el) => el.getAttribute("aria-label"))).toEqual([
      "Digit 1 of 4",
      "Digit 2 of 4",
      "Digit 3 of 4",
      "Digit 4 of 4",
    ]);
  });

  it("translates the cell names through labels.digit", () => {
    const host = mount(<OtpInput length={3} labels={{ digit: "Chiffre {n} sur {total}" }} />);
    expect(cells(host).map((el) => el.getAttribute("aria-label"))).toEqual([
      "Chiffre 1 sur 3",
      "Chiffre 2 sur 3",
      "Chiffre 3 sur 3",
    ]);
  });
});

describe("direction is unchanged", () => {
  it("stays dir=ltr inside an RTL page, and the arrows move visually", () => {
    const host = mount(<OtpInput length={4} />, "rtl");
    expect(host.querySelector("[data-react-fancy-otp-input]")!.getAttribute("dir")).toBe("ltr");
    const c = cells(host);
    act(() => c[1].focus());
    key(c[1], "ArrowRight");
    expect(document.activeElement).toBe(c[2]);
    key(c[2], "ArrowLeft");
    expect(document.activeElement).toBe(c[1]);
  });
});
