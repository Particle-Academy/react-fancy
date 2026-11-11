// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import {
  HotkeyCapture,
  formatHotkey,
  parseHotkey,
  type HotkeyCaptureProps,
} from "../src/components/HotkeyCapture";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * HotkeyCapture (CC-fancy-0022): records a keyboard shortcut.
 *
 * The value is a normalised string, `"ctrl+shift+k"`: modifiers in a fixed
 * order, then one key, all lower case. That makes two equal shortcuts `===`
 * equal, and an agent can read or write one without building an object.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const trigger = (host: Element) =>
  host.querySelector<HTMLButtonElement>("[data-react-fancy-hotkey-capture-trigger]")!;
const root = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-hotkey-capture]")!;
const status = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-hotkey-capture-status]")!;

function key(el: Element, init: KeyboardEventInit): boolean {
  const ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  act(() => {
    el.dispatchEvent(ev);
  });
  return ev.defaultPrevented;
}

function Controlled(props: Partial<HotkeyCaptureProps> & { initial?: string; log?: string[] }) {
  const { initial = "", log, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <HotkeyCapture
      platform="generic"
      {...rest}
      value={value}
      onChange={(v) => {
        log?.push(v);
        setValue(v);
      }}
    />
  );
}

describe("parseHotkey / formatHotkey", () => {
  it("normalises modifier order and case", () => {
    expect(formatHotkey({ key: "K", shift: true, ctrl: true })).toBe("ctrl+shift+k");
    expect(formatHotkey(parseHotkey("Shift+Meta+Alt+Ctrl+F5"))).toBe("ctrl+alt+shift+meta+f5");
  });

  it("parses a string into the combination object", () => {
    expect(parseHotkey("ctrl+shift+k")).toEqual({
      key: "k",
      ctrl: true,
      alt: false,
      shift: true,
      meta: false,
    });
  });

  it("returns null for an empty or modifier-only string", () => {
    expect(parseHotkey("")).toBeNull();
    expect(parseHotkey("ctrl+shift")).toBeNull();
  });
});

describe("HotkeyCapture", () => {
  it("renders the controlled value as keycaps with the kit's Kbd", () => {
    const { host } = mount(<HotkeyCapture platform="generic" value="ctrl+shift+k" onChange={() => {}} />);

    const kbd = trigger(host).querySelector("[data-react-fancy-kbd]")!;
    expect(kbd).not.toBeNull();
    const caps = [...kbd.querySelectorAll("span")].filter((s) => !s.hasAttribute("aria-hidden"));
    expect(caps.map((c) => c.textContent)).toEqual(["Ctrl", "Shift", "K"]);
    expect(root(host).getAttribute("data-value")).toBe("ctrl+shift+k");
    expect(root(host).getAttribute("data-state")).toBe("idle");
  });

  it("has an accessible name that includes the current combination", () => {
    const { host } = mount(
      <HotkeyCapture platform="generic" label="Open palette" value="ctrl+k" onChange={() => {}} />,
    );
    expect(trigger(host).getAttribute("aria-label")).toBe("Open palette: Ctrl+K");
  });

  it("click starts capturing and shows the prompt", () => {
    const { host } = mount(<Controlled />);
    act(() => trigger(host).click());

    expect(root(host).getAttribute("data-state")).toBe("capturing");
    expect(trigger(host).textContent).toContain("Press the keys…");
    expect(trigger(host).getAttribute("aria-pressed")).toBe("true");
  });

  it("Enter and Space start capturing from the keyboard", () => {
    for (const k of ["Enter", " "]) {
      const { host } = mount(<Controlled />);
      expect(key(trigger(host), { key: k, code: k === " " ? "Space" : "Enter" })).toBe(true);
      expect(root(host).getAttribute("data-state")).toBe("capturing");
    }
  });

  it("commits the combination, announces it politely, and stops capturing", () => {
    const log: string[] = [];
    const { host } = mount(<Controlled log={log} />);
    act(() => trigger(host).click());

    expect(key(trigger(host), { key: "K", code: "KeyK", ctrlKey: true, shiftKey: true })).toBe(true);

    expect(log).toEqual(["ctrl+shift+k"]);
    expect(root(host).getAttribute("data-state")).toBe("idle");
    expect(status(host).getAttribute("aria-live")).toBe("polite");
    expect(status(host).textContent).toBe("Shortcut set to Ctrl+Shift+K");
  });

  it("reads the physical key, so Shift+1 is 1 and not !", () => {
    const log: string[] = [];
    const { host } = mount(<Controlled log={log} />);
    act(() => trigger(host).click());
    key(trigger(host), { key: "!", code: "Digit1", shiftKey: true });
    expect(log).toEqual(["shift+1"]);
  });

  it("a modifier pressed alone does not commit, but shows as held", () => {
    const log: string[] = [];
    const { host } = mount(<Controlled log={log} />);
    act(() => trigger(host).click());

    key(trigger(host), { key: "Control", code: "ControlLeft", ctrlKey: true });
    key(trigger(host), { key: "Shift", code: "ShiftLeft", ctrlKey: true, shiftKey: true });

    expect(log).toEqual([]);
    expect(root(host).getAttribute("data-state")).toBe("capturing");
    expect(trigger(host).textContent).toContain("Ctrl");
    expect(trigger(host).textContent).toContain("Shift");
  });

  it("Escape cancels and restores the previous value", () => {
    const log: string[] = [];
    const { host } = mount(<Controlled initial="alt+p" log={log} />);
    act(() => trigger(host).click());
    key(trigger(host), { key: "Control", code: "ControlLeft", ctrlKey: true });

    expect(key(trigger(host), { key: "Escape", code: "Escape" })).toBe(true);

    expect(log).toEqual([]);
    expect(root(host).getAttribute("data-state")).toBe("idle");
    expect(root(host).getAttribute("data-value")).toBe("alt+p");
    expect(trigger(host).textContent).toContain("Alt");
    expect(trigger(host).textContent).toContain("P");
    expect(status(host).textContent).toBe("Cancelled");
  });

  it("losing focus while capturing cancels too", () => {
    const log: string[] = [];
    const { host } = mount(<Controlled initial="alt+p" log={log} />);
    act(() => trigger(host).click());
    act(() => {
      trigger(host).dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(root(host).getAttribute("data-state")).toBe("idle");
    expect(log).toEqual([]);
  });

  it("is controlled: a value the host does not apply does not stick", () => {
    const { host } = mount(<HotkeyCapture platform="generic" value="ctrl+a" onChange={() => {}} />);
    act(() => trigger(host).click());
    key(trigger(host), { key: "b", code: "KeyB", ctrlKey: true });
    expect(root(host).getAttribute("data-value")).toBe("ctrl+a");
  });

  it("works uncontrolled from defaultValue", () => {
    const { host } = mount(<HotkeyCapture platform="generic" defaultValue="ctrl+a" />);
    act(() => trigger(host).click());
    key(trigger(host), { key: "b", code: "KeyB", ctrlKey: true });
    expect(root(host).getAttribute("data-value")).toBe("ctrl+b");
  });

  it("names Command on Apple", () => {
    const { host } = mount(<HotkeyCapture platform="apple" value="meta+k" onChange={() => {}} />);
    expect(trigger(host).textContent).toContain("⌘");
  });

  it("disabled does not capture", () => {
    const { host } = mount(<Controlled disabled />);
    act(() => trigger(host).click());
    expect(root(host).getAttribute("data-state")).toBe("idle");
    expect(trigger(host).disabled).toBe(true);
  });

  it("every string comes from labels", () => {
    const labels = {
      label: "Atajo",
      empty: "Sin asignar",
      prompt: "Pulsa las teclas…",
      captured: "Atajo: {combo}",
      cancelled: "Cancelado",
      trigger: "{label} — {combo}",
      keys: { ctrl: "Strg", shift: "Umschalt" },
    };
    const { host } = mount(<Controlled labels={labels} />);

    expect(trigger(host).textContent).toBe("Sin asignar");
    expect(trigger(host).getAttribute("aria-label")).toBe("Atajo — Sin asignar");
    act(() => trigger(host).click());
    expect(trigger(host).textContent).toContain("Pulsa las teclas…");
    key(trigger(host), { key: "k", code: "KeyK", ctrlKey: true, shiftKey: true });
    expect(status(host).textContent).toBe("Atajo: Strg+Umschalt+K");
    expect(trigger(host).textContent).toContain("Strg");
    act(() => trigger(host).click());
    key(trigger(host), { key: "Escape", code: "Escape" });
    expect(status(host).textContent).toBe("Cancelado");
  });

  it("is SSR-safe and renders its handles on the server", () => {
    const html = renderToString(<HotkeyCapture value="ctrl+k" onChange={() => {}} />);
    expect(html).toContain("data-react-fancy-hotkey-capture=");
    expect(html).toContain("data-react-fancy-hotkey-capture-trigger");
    expect(html).toContain("data-react-fancy-hotkey-capture-status");
    expect(html).toContain('data-value="ctrl+k"');
    // The server cannot know the platform, so it names the pressable default.
    expect(html).toContain("Ctrl");
  });

  it("puts the value in a form field when given a name", () => {
    const { host } = mount(<HotkeyCapture name="shortcut" value="ctrl+k" onChange={() => {}} />);
    expect(host.querySelector<HTMLInputElement>('input[name="shortcut"]')!.value).toBe("ctrl+k");
  });
});
