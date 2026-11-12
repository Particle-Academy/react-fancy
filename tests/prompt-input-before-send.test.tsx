// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { PromptInput } from "../src/components/PromptInput/PromptInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PromptInput's action row: a `beforeSend` slot immediately left of Send, the
 * send-key hint drawn in the row for an icon send too, and a hint that names
 * ANY submit key, not only Enter or Mod+Enter. An app records the key with
 * HotkeyCapture and hands the string to `submitKey`; the hint, tooltip, name
 * and `aria-keyshortcuts` must all name that key, and only that key may send.
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
  return { host };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.useRealTimers();
});

const textarea = (host: Element) => host.querySelector("textarea")!;
const send = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-prompt-input-send]")!;
const hint = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-prompt-input-hint]");
const slot = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-prompt-input-before-send]");
const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

function typeInto(ta: HTMLTextAreaElement, text: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(ta, text);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press(el: Element, init: KeyboardEventInit): boolean {
  const ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  act(() => {
    el.dispatchEvent(ev);
  });
  return ev.defaultPrevented;
}

function hover(el: Element) {
  vi.useFakeTimers();
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(500);
  });
  return document.querySelector("[data-react-fancy-tooltip]");
}

const before = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("PromptInput beforeSend", () => {
  for (const sendButton of ["label", "icon"] as const) {
    it(`sits immediately left of the ${sendButton} send button, in the action row`, () => {
      const { host } = mount(
        <PromptInput
          budgetTokens={1000}
          sendButton={sendButton}
          beforeSend={<span data-model>claude-opus · high effort</span>}
          onSubmit={() => {}}
        />,
      );
      const s = slot(host)!;
      expect(s).not.toBeNull();
      expect(s.querySelector("[data-model]")).not.toBeNull();
      expect(s.nextElementSibling).toBe(send(host));
      expect(s.parentElement).toBe(send(host).parentElement);
    });
  }

  it("truncates with an ellipsis and never squeezes Send", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} beforeSend="a very long model name indeed" onSubmit={() => {}} />,
    );
    // min-width 0 lets a flex item shrink below its content; truncate draws the ellipsis.
    expect(classes(slot(host))).toEqual(expect.arrayContaining(["min-w-0", "truncate"]));
    // Its row may shrink too, or the slot could never get narrower than its text.
    expect(classes(slot(host)!.parentElement)).toContain("min-w-0");
    expect(classes(slot(host)!.parentElement)).not.toContain("shrink-0");
    expect(classes(send(host))).toContain("shrink-0");
  });

  it("renders nothing, and leaves the row as it was, when not given", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);
    expect(slot(host)).toBeNull();
    expect(classes(send(host).parentElement)).toContain("shrink-0");
  });
});

describe("PromptInput send-key hint in the action row", () => {
  it("is drawn for an icon send button too, left of Send", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} sendButton="icon" platform="generic" onSubmit={() => {}} />,
    );
    const h = hint(host)!;
    expect(h).not.toBeNull();
    expect(h.textContent).toBe("Ctrl + Enter to send");
    expect(h.parentElement).toBe(send(host).parentElement);
    expect(before(h, send(host))).toBe(true);
  });

  it("sits left of beforeSend, so beforeSend stays immediately left of Send", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} sendButton="icon" beforeSend="model" onSubmit={() => {}} />,
    );
    expect(before(hint(host)!, slot(host)!)).toBe(true);
  });

  it("showHint={false} opts out, for an icon send as well", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} sendButton="icon" showHint={false} onSubmit={() => {}} />,
    );
    expect(hint(host)).toBeNull();
  });
});

describe("PromptInput submitKey: any recorded key combo", () => {
  it("a HotkeyCapture string sends on exactly that combo", () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={1000} submitKey="ctrl+shift+enter" onSubmit={(t) => sent.push(t)} />,
    );
    typeInto(textarea(host), "hi");

    expect(press(textarea(host), { key: "Enter" })).toBe(false);
    expect(press(textarea(host), { key: "Enter", ctrlKey: true })).toBe(false);
    expect(sent).toEqual([]);

    expect(press(textarea(host), { key: "Enter", ctrlKey: true, shiftKey: true })).toBe(true);
    expect(sent).toEqual(["hi"]);
  });

  it("names that combo in the hint, the tooltip, the name and aria-keyshortcuts", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={1000}
        sendButton="icon"
        platform="generic"
        submitKey="ctrl+shift+enter"
        onSubmit={() => {}}
      />,
    );
    expect(hint(host)!.textContent).toBe("Ctrl + Shift + Enter to send");
    expect(send(host).getAttribute("aria-label")).toBe("Send (Ctrl+Shift+Enter)");
    expect(send(host).getAttribute("aria-keyshortcuts")).toBe("Control+Shift+Enter");
    expect(textarea(host).placeholder).toContain("Ctrl+Shift+Enter to send");
    expect(hover(send(host))!.textContent).toBe("Send · Ctrl+Shift+Enter");
  });

  it("formats the platform's names: Option and the Command glyph on Apple", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} platform="apple" submitKey="alt+meta+s" onSubmit={() => {}} />,
    );
    expect(hint(host)!.textContent).toBe("Option + ⌘ + S to send");
  });

  it('"mod" names the platform modifier, and either Ctrl or Command presses it', () => {
    const sent: string[] = [];
    const apple = mount(
      <PromptInput
        budgetTokens={1000}
        platform="apple"
        sendButton="icon"
        submitKey="mod+k"
        onSubmit={(t) => sent.push(t)}
      />,
    ).host;
    const generic = mount(
      <PromptInput budgetTokens={1000} platform="generic" submitKey="mod+k" onSubmit={() => {}} />,
    ).host;
    expect(hint(apple)!.textContent).toBe("⌘ + K to send");
    expect(hint(generic)!.textContent).toBe("Ctrl + K to send");
    expect(send(apple).getAttribute("aria-keyshortcuts")).toBe("Meta+K Control+K");

    typeInto(textarea(apple), "one");
    press(textarea(apple), { key: "k", code: "KeyK" });
    expect(sent).toEqual([]);
    press(textarea(apple), { key: "k", code: "KeyK", metaKey: true });
    expect(sent).toEqual(["one"]);
  });

  it("labels.keys renames any key, and labels.hint the words after it", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={1000}
        platform="generic"
        submitKey="ctrl+enter"
        labels={{ keys: { ctrl: "Strg", enter: "Eingabe" }, hint: "zum Senden" }}
        onSubmit={() => {}}
      />,
    );
    expect(hint(host)!.textContent).toBe("Strg + Eingabe zum Senden");
  });

  it("labels.shortcut names the combo in the hint as well", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} submitKey="f13" labels={{ shortcut: "Pedal" }} onSubmit={() => {}} />,
    );
    expect(hint(host)!.textContent).toBe("Pedal to send");
  });

  it("the inline editor sends on the combo, and an Enter that is not the combo breaks the line", () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput
        budgetTokens={1000}
        submitKey="ctrl+shift+enter"
        pasteThreshold={500}
        defaultValue="inline"
        onSubmit={(t) => sent.push(t)}
      />,
    );
    const editor = host.querySelector("[data-react-fancy-composer-input]")!;

    // Ctrl+Enter alone would send in the editor's mod-enter mode; it must not here.
    press(editor, { key: "Enter", ctrlKey: true });
    expect(sent).toEqual([]);

    press(editor, { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(sent).toEqual(["inline\n"]);
  });
});
