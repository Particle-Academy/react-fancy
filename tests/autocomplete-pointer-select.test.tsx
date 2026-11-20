// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Autocomplete } from "../src/components/Autocomplete";
import type { AutocompleteOption } from "../src/components/Autocomplete/Autocomplete.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The option list renders through a Portal, outside the wrapper, and the
 * outside-press guard only knew about the wrapper. So pressing an option was an
 * "outside" press: `mousedown` closed the list, the option unmounted, and its
 * `click` (which selects) never reached anything. Mouse and touch selection
 * were dead; only the keyboard worked. The list is now part of "inside".
 */

const mounted: Array<() => void> = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!();
  document.body.innerHTML = "";
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

const OPTIONS: AutocompleteOption[] = [
  { value: "apple", label: "Apple" },
  { value: "apricot", label: "Apricot" },
  { value: "banana", label: "Banana" },
];

function Host({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <Autocomplete
        options={OPTIONS}
        value={value}
        onChange={(v) => {
          onChange(v);
          setValue(v);
        }}
      />
      <button type="button" data-testid="outside">
        Elsewhere
      </button>
    </>
  );
}

function type(input: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    input.focus();
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const listbox = () => document.querySelector<HTMLElement>('[role="listbox"]');
const option = (label: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (el) => el.textContent === label,
  );

/** Fires each event in its own act(), the way a browser delivers them. Returns
 * whether `mousedown` was default-prevented. */
function press(el: HTMLElement, sequence: string[]): boolean {
  let mouseDownPrevented = false;
  for (const name of sequence) {
    // A press can unmount `el` part way (the old bug), so stop dispatching to a
    // detached node: a real browser would not deliver the rest to it either.
    if (!el.isConnected) break;
    act(() => {
      let ev: Event;
      if (name.startsWith("pointer")) {
        ev = new MouseEvent(name, { bubbles: true, cancelable: true });
        Object.defineProperty(ev, "pointerType", {
          value: sequence.includes("touchstart") ? "touch" : "mouse",
        });
      } else if (name.startsWith("touch")) {
        ev = new Event(name, { bubbles: true, cancelable: true });
      } else {
        ev = new MouseEvent(name, { bubbles: true, cancelable: true });
      }
      const notPrevented = el.dispatchEvent(ev);
      if (name === "mousedown") mouseDownPrevented = !notPrevented;
    });
  }
  return mouseDownPrevented;
}

const MOUSE = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
const TOUCH = ["touchstart", "pointerdown", "touchend", "pointerup", "mousedown", "mouseup", "click"];

describe("Autocomplete selection by pointer", () => {
  it("selects an option pressed with a mouse, then closes the list", () => {
    const onChange = vi.fn();
    const host = mount(<Host onChange={onChange} />);
    const input = host.querySelector("input")!;

    type(input, "ap");
    expect(listbox()).not.toBeNull();
    const target = option("Apricot")!;
    expect(target).toBeTruthy();

    press(target, MOUSE);

    expect(onChange).toHaveBeenCalledWith("apricot");
    expect(listbox()).toBeNull();
    expect(input.value).toBe("Apricot");
  });

  it("selects an option tapped on a touch screen, then closes the list", () => {
    const onChange = vi.fn();
    const host = mount(<Host onChange={onChange} />);
    const input = host.querySelector("input")!;

    type(input, "ap");
    press(option("Apple")!, TOUCH);

    expect(onChange).toHaveBeenCalledWith("apple");
    expect(listbox()).toBeNull();
    expect(input.value).toBe("Apple");
  });

  it("keeps focus in the field while an option is pressed", () => {
    const host = mount(<Host onChange={() => {}} />);
    const input = host.querySelector("input")!;

    type(input, "ap");
    const prevented = press(option("Apple")!, ["pointerdown", "mousedown"]);

    expect(prevented).toBe(true);
    expect(listbox()).not.toBeNull();
  });

  it("still closes on a press outside, without selecting", () => {
    const onChange = vi.fn();
    const host = mount(<Host onChange={onChange} />);
    type(host.querySelector("input")!, "ap");
    expect(listbox()).not.toBeNull();

    press(document.querySelector<HTMLElement>('[data-testid="outside"]')!, MOUSE);

    expect(listbox()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still closes on a touch outside", () => {
    const host = mount(<Host onChange={() => {}} />);
    type(host.querySelector("input")!, "ap");

    press(document.querySelector<HTMLElement>('[data-testid="outside"]')!, ["touchstart"]);

    expect(listbox()).toBeNull();
  });
});
