// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NumberField } from "../src/components/inputs/NumberField";
import type { NumberFieldProps } from "../src/components/inputs/NumberField";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

function mount(el: ReactElement): HTMLElement {
  const host = document.createElement("div");
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

const field = (h: HTMLElement) => h.querySelector<HTMLInputElement>('input:not([type="hidden"])')!;

function type(el: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press(el: HTMLInputElement, key: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

function blur(el: HTMLInputElement) {
  act(() => {
    el.focus();
    el.blur();
  });
}

/** A real controlled parent, so the tests exercise the value coming back round. */
function Harness({
  initial = null,
  onValue,
  ...rest
}: Omit<NumberFieldProps, "value" | "onValueChange"> & {
  initial?: number | null;
  onValue?: (v: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <NumberField
      {...rest}
      value={value}
      onValueChange={(v) => {
        onValue?.(v);
        setValue(v);
      }}
    />
  );
}

describe("NumberField value contract", () => {
  it("shows null as blank, never as 0", () => {
    expect(field(mount(<NumberField value={null} />)).value).toBe("");
  });

  it("shows 0 as 0, because 0 is a value", () => {
    expect(field(mount(<NumberField value={0} />)).value).toBe("0");
  });

  it("emits a number, not a string", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness onValue={onValue} />));

    type(el, "42");

    expect(onValue).toHaveBeenCalledWith(42);
  });

  it("emits null when cleared, never 0", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness initial={5} onValue={onValue} />));

    type(el, "");

    expect(onValue.mock.calls).toEqual([[null]]);
    expect(el.value).toBe("");
  });

  it.each(["-", ".", "-.", "1e", "1e-", "+", "e"])("treats partial input %j as no number, and keeps the text", (partial) => {
    const onValue = vi.fn();
    const el = field(mount(<Harness onValue={onValue} />));

    type(el, partial);

    expect(onValue).not.toHaveBeenCalled();
    expect(el.value).toBe(partial);
  });

  it("goes to null, not a stale number, when a value is replaced by partial input", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness initial={15} onValue={onValue} />));

    type(el, "-");

    // Holding 15 here would submit a number that is no longer on screen.
    expect(onValue.mock.calls).toEqual([[null]]);
    expect(el.value).toBe("-");
  });

  it("emits only correct numbers on the way through 1e5", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness onValue={onValue} />));

    for (const text of ["1", "1e", "1e5"]) type(el, text);

    expect(onValue.mock.calls.map((c) => c[0])).toEqual([1, null, 100000]);
    expect(el.value).toBe("1e5");
  });

  it("keeps the trailing point and zero while typing a decimal", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness onValue={onValue} />));

    for (const text of ["1", "1.", "1.0", "1.05"]) type(el, text);

    expect(el.value).toBe("1.05");
    expect(onValue.mock.calls.map((c) => c[0])).toEqual([1, 1.05]);
  });

  it.each(["0x10", "Infinity", "-Infinity", "NaN", "1,000", "1 000", "12abc", "1_000", "99999999999999999999"])(
    "never reads %j as a number",
    (junk) => {
      const onValue = vi.fn();
      const el = field(mount(<Harness onValue={onValue} />));

      type(el, junk);

      expect(onValue).not.toHaveBeenCalled();
    },
  );

  it("normalises -0 to 0 so a consumer's Object.is does not trip", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness initial={1} onValue={onValue} />));

    type(el, "-0");

    expect(Object.is(onValue.mock.calls[0][0], 0)).toBe(true);
    expect(el.value).toBe("-0");
  });

  it("on blur, shows what the value is", () => {
    const el = field(mount(<Harness />));

    type(el, "-");
    blur(el);
    expect(el.value).toBe("");

    type(el, "1.50");
    blur(el);
    expect(el.value).toBe("1.5");
  });

  it("follows the parent when the value changes from outside", () => {
    let set: (v: number | null) => void = () => {};
    function Outside() {
      const [v, setV] = useState<number | null>(1);
      set = setV;
      return <NumberField value={v} />;
    }
    const el = field(mount(<Outside />));

    act(() => set(7));
    expect(el.value).toBe("7");

    act(() => set(null));
    expect(el.value).toBe("");
  });

  it("is really controlled: a parent that refuses the change wins", () => {
    const el = field(mount(<NumberField value={3} onValueChange={() => {}} />));

    type(el, "4");

    expect(el.value).toBe("3");
  });

  it("does not choke on a NaN from the host", () => {
    const el = field(mount(<NumberField value={Number.NaN} />));

    expect(el.value).toBe("");
  });

  it("survives a host value too large to round-trip", () => {
    const el = field(mount(<NumberField value={2 ** 60} />));

    expect(el.value).toBe(String(2 ** 60));
  });
});

describe("NumberField wheel guard", () => {
  it("renders a text input, which the browser's wheel handling never touches", () => {
    // Real-browser proof sits outside this suite: jsdom has no wheel behaviour,
    // so this pins the mechanism that makes the guard true.
    expect(field(mount(<NumberField value={1} />)).type).toBe("text");
  });

  it("ignores wheel events", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness initial={5} step={1} onValue={onValue} />));

    act(() => {
      el.focus();
      el.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true }));
    });

    expect(onValue).not.toHaveBeenCalled();
    expect(el.value).toBe("5");
  });
});

describe("NumberField min / max / step", () => {
  it("steps with the arrow keys, by 1 when no step is given", () => {
    const el = field(mount(<Harness initial={5} />));

    press(el, "ArrowUp");
    expect(el.value).toBe("6");

    press(el, "ArrowDown");
    press(el, "ArrowDown");
    expect(el.value).toBe("4");
  });

  it("steps by step without floating-point dust", () => {
    const el = field(mount(<Harness initial={0.1} step={0.1} />));

    press(el, "ArrowUp");
    press(el, "ArrowUp");

    expect(el.value).toBe("0.3");
  });

  it("stops at max and min", () => {
    const el = field(mount(<Harness initial={9} min={0} max={10} step={2} />));

    press(el, "ArrowUp");
    expect(el.value).toBe("10");
    press(el, "ArrowUp");
    expect(el.value).toBe("10");
  });

  it("does not step past a max the step grid cannot land on", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness initial={10} min={0} max={11} step={3} onValue={onValue} />));

    press(el, "ArrowDown");
    expect(el.value).toBe("9");
    press(el, "ArrowUp");
    expect(el.value).toBe("9");
    expect(onValue.mock.calls).toEqual([[9]]);
  });

  it("snaps a misaligned value onto the grid, counted from min", () => {
    const el = field(mount(<Harness initial={7} min={1} step={5} />));

    press(el, "ArrowUp");
    expect(el.value).toBe("11");
  });

  it("steps from blank to a real number, inside the range", () => {
    const up = field(mount(<Harness />));
    press(up, "ArrowUp");
    expect(up.value).toBe("1");

    const bounded = field(mount(<Harness min={5} max={9} />));
    press(bounded, "ArrowUp");
    expect(bounded.value).toBe("5");
  });

  it("treats step=any as free typing with arrows moving by 1", () => {
    const onValue = vi.fn();
    const el = field(mount(<Harness initial={1.5} step="any" onValue={onValue} />));

    expect(el.validationMessage).toBe("");
    press(el, "ArrowUp");
    expect(onValue).toHaveBeenLastCalledWith(2);
  });

  it("leaves a typed out-of-range value alone and reports it, as a native number input does", () => {
    // Typing "5" on the way to "50" with min=10 must not be rewritten mid-word.
    const onValue = vi.fn();
    const el = field(mount(<Harness min={10} max={100} onValue={onValue} />));

    type(el, "5");
    expect(onValue).toHaveBeenLastCalledWith(5);
    expect(el.value).toBe("5");
    expect(el.checkValidity()).toBe(false);
    expect(el.getAttribute("aria-invalid")).toBe("true");

    type(el, "50");
    expect(el.checkValidity()).toBe(true);
    expect(el.getAttribute("aria-invalid")).toBeNull();

    type(el, "500");
    expect(el.checkValidity()).toBe(false);
  });

  it("flags a step mismatch only when a step was declared", () => {
    const declared = field(mount(<Harness initial={1.5} step={1} />));
    expect(declared.checkValidity()).toBe(false);

    const undeclared = field(mount(<Harness initial={1.5} />));
    expect(undeclared.checkValidity()).toBe(true);

    const onGrid = field(mount(<Harness initial={0.3} step={0.1} />));
    expect(onGrid.checkValidity()).toBe(true);
  });

  it("blocks a form submit while the text is not a number", () => {
    const el = field(mount(<Harness />));

    type(el, "-");

    expect(el.checkValidity()).toBe(false);
  });

  it("lets the host word the validation messages", () => {
    const el = field(
      mount(<Harness initial={1} min={5} messages={{ min: "Trop petit" }} />),
    );

    expect(el.validationMessage).toBe("Trop petit");
  });

  it("does not step when disabled or read-only", () => {
    const onValue = vi.fn();
    const off = field(mount(<Harness initial={1} disabled onValue={onValue} />));
    const ro = field(mount(<Harness initial={1} readOnly onValue={onValue} />));

    press(off, "ArrowUp");
    press(ro, "ArrowUp");

    expect(onValue).not.toHaveBeenCalled();
  });

  it("lets a host's onKeyDown veto the step", () => {
    const onValue = vi.fn();
    const el = field(
      mount(<Harness initial={1} onValue={onValue} onKeyDown={(e) => e.preventDefault()} />),
    );

    press(el, "ArrowUp");

    expect(onValue).not.toHaveBeenCalled();
  });
});

describe("NumberField handles + semantics", () => {
  it("carries stable handles and spinbutton semantics", () => {
    const host = mount(<NumberField id="qty" value={3} min={0} max={9} />);
    const el = field(host);

    expect(host.querySelector("[data-react-fancy-number-field]")).not.toBeNull();
    expect(el.id).toBe("qty");
    expect(el.getAttribute("role")).toBe("spinbutton");
    expect(el.getAttribute("aria-valuenow")).toBe("3");
    expect(el.getAttribute("aria-valuemin")).toBe("0");
    expect(el.getAttribute("aria-valuemax")).toBe("9");
  });

  it("drops aria-valuenow when blank, rather than announcing 0", () => {
    expect(field(mount(<NumberField value={null} />)).getAttribute("aria-valuenow")).toBeNull();
  });

  it("forwards its ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    const host = mount(<NumberField ref={ref} value={1} />);

    expect(ref.current).toBe(field(host));
  });

  it("asks for a keypad a negative number can be typed on", () => {
    expect(field(mount(<NumberField value={1} />)).inputMode).toBe("text");
    expect(field(mount(<NumberField value={1} min={0} />)).inputMode).toBe("decimal");
    expect(field(mount(<NumberField value={1} min={0} step={1} />)).inputMode).toBe("numeric");
    expect(field(mount(<NumberField value={1} inputMode="tel" />)).inputMode).toBe("tel");
  });

  it("renders the unit through the existing suffix prop", () => {
    const host = mount(<NumberField value={1} suffix="kg" />);

    expect(host.textContent).toContain("kg");
  });

  it("wires label, description and error through Field", () => {
    const host = mount(<NumberField id="w" value={1} label="Weight" description="In kg" />);

    expect(host.querySelector('label[for="w"]')?.textContent).toContain("Weight");
    expect(host.textContent).toContain("In kg");
    expect(mount(<NumberField value={1} error="Too heavy" />).textContent).toContain("Too heavy");
  });

  it("posts the number under name, not the text on screen", () => {
    const host = mount(
      <form>
        <Harness name="qty" />
      </form>,
    );
    const el = field(host);
    const form = host.querySelector("form")!;

    type(el, "1.50");
    expect(new FormData(form).get("qty")).toBe("1.5");
    expect(el.getAttribute("name")).toBeNull();

    type(el, "-");
    expect(new FormData(form).get("qty")).toBe("");
  });

  it("does not post when disabled", () => {
    const host = mount(
      <form>
        <NumberField name="qty" value={1} disabled />
      </form>,
    );

    expect(new FormData(host.querySelector("form")!).has("qty")).toBe(false);
  });

  it("renders the value as text in view mode", () => {
    const host = mount(<NumberField value={12.5} mode="view" disabled />);

    expect(host.querySelector('input:not([type="hidden"])')).toBeNull();
    expect(host.textContent).toContain("12.5");
  });

  it("works uncontrolled from defaultValue", () => {
    const onValue = vi.fn();
    const el = field(mount(<NumberField defaultValue={2} onValueChange={onValue} />));

    expect(el.value).toBe("2");
    press(el, "ArrowUp");
    expect(el.value).toBe("3");
    expect(onValue).toHaveBeenCalledWith(3);
  });
});
