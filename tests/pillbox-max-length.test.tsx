// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Pillbox } from "../src/components/Pillbox";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CC-fancy-0017 (6.18.0): an optional `maxLength` on Pillbox. Every block that
 * sets it failed on 6.17.1, which had no such prop; "unset means no cap" pins
 * today's behaviour.
 */

const roots: Root[] = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
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

const input = (host: HTMLElement) =>
  host.querySelector<HTMLInputElement>("[data-react-fancy-pillbox] input")!;

const status = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[data-react-fancy-pillbox-status][aria-live="polite"]')!;

const pills = (host: HTMLElement) =>
  [...host.querySelectorAll("[data-react-fancy-pillbox] > span:not([data-react-fancy-pillbox-status])")].map(
    (s) => s.textContent,
  );

/**
 * Set the input's value the way the browser reports it to React. This bypasses
 * the native `maxlength` attribute on purpose: it is what a paste, an IME, an
 * extension or an agent writing the DOM can deliver, so the component must hold
 * the cap itself rather than trusting the attribute.
 */
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

describe("Pillbox maxLength: typing", () => {
  it("sets the native maxlength so the browser stops accepting characters", () => {
    const host = mount(<Pillbox maxLength={8} />);
    expect(input(host).maxLength).toBe(8);
  });

  it("accepts characters up to the cap and no further", () => {
    const host = mount(<Pillbox maxLength={8} />);
    const el = input(host);
    let text = "";
    for (const ch of "abcdefghij") {
      text = el.value + ch;
      typeInto(el, text);
    }
    expect(el.value).toBe("abcdefgh");
    key(el, "Enter");
    expect(pills(host)).toEqual(["abcdefgh"]);
  });
});

describe("Pillbox maxLength: paste over the cap", () => {
  it("never adds a value longer than the cap", () => {
    const host = mount(<Pillbox maxLength={5} />);
    const el = input(host);
    typeInto(el, "abcdefghij");
    expect(el.value.length).toBeLessThanOrEqual(5);
    key(el, "Enter");
    for (const p of pills(host)) expect(p!.length).toBeLessThanOrEqual(5);
  });

  it("does not report an over-long value through onChange", () => {
    const seen: string[][] = [];
    function Host() {
      const [v, setV] = useState<string[]>([]);
      return (
        <Pillbox
          value={v}
          maxLength={4}
          onChange={(next) => {
            seen.push(next);
            setV(next);
          }}
        />
      );
    }
    const host = mount(<Host />);
    typeInto(input(host), "toolong");
    key(input(host), "Enter");
    for (const next of seen) for (const tag of next) expect(tag.length).toBeLessThanOrEqual(4);
  });
});

describe("Pillbox maxLength: remaining-count announcement", () => {
  it("says nothing while more than 5 characters remain", () => {
    const host = mount(<Pillbox maxLength={20} />);
    typeInto(input(host), "abcdefghijklmn"); // 6 remaining
    expect(status(host).textContent).toBe("");
  });

  it("announces politely within 5 characters of the cap", () => {
    const host = mount(<Pillbox maxLength={20} />);
    typeInto(input(host), "abcdefghijklmno"); // 5 remaining
    expect(status(host).getAttribute("aria-live")).toBe("polite");
    expect(status(host).textContent).toBe("5 characters remaining");
    typeInto(input(host), "abcdefghijklmnopqrst"); // 0 remaining
    expect(status(host).textContent).toBe("0 characters remaining");
  });

  it("clears the count when the text moves back out of range", () => {
    const host = mount(<Pillbox maxLength={20} />);
    typeInto(input(host), "abcdefghijklmnopq");
    expect(status(host).textContent).toBe("3 characters remaining");
    typeInto(input(host), "abc");
    expect(status(host).textContent).toBe("");
  });

  it("takes its words from `labels.remaining` with a {remaining} slot", () => {
    const host = mount(<Pillbox maxLength={10} labels={{ remaining: "Quedan {remaining}" }} />);
    typeInto(input(host), "abcdefgh");
    expect(status(host).textContent).toBe("Quedan 2");
  });
});

describe("Pillbox without maxLength", () => {
  it("has no cap and announces no count", () => {
    const host = mount(<Pillbox />);
    const el = input(host);
    expect(el.hasAttribute("maxlength")).toBe(false);
    const long = "x".repeat(300);
    typeInto(el, long);
    expect(el.value).toBe(long);
    expect(status(host).textContent).toBe("");
    key(el, "Enter");
    expect(pills(host)).toEqual([long]);
  });
});
