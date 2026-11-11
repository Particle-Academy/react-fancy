// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { PromptInput } from "../src/components/PromptInput/PromptInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `submitKey` (CC-fancy-0022).
 *
 * PromptInput only ever sent on Ctrl/Command+Enter, which is right for a long
 * prompt and wrong for a chat box, where people expect Enter to send and
 * Shift+Enter to break the line. The tooltip on the icon send button also
 * hardcoded "Send · <mod>+Enter", so a host that changed the key (or the
 * language) had a tooltip naming a shortcut that did nothing.
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

function typeInto(ta: HTMLTextAreaElement, text: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(ta, text);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Fire a keydown and report whether the component claimed it. */
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

describe("PromptInput submitKey", () => {
  it("defaults to mod+enter: plain Enter is a newline, Ctrl+Enter sends", () => {
    const sent: string[] = [];
    const { host } = mount(<PromptInput budgetTokens={1000} onSubmit={(t) => sent.push(t)} />);
    typeInto(textarea(host), "hi");

    expect(press(textarea(host), { key: "Enter" })).toBe(false);
    expect(sent).toEqual([]);

    press(textarea(host), { key: "Enter", ctrlKey: true });
    expect(sent).toEqual(["hi"]);
  });

  it('"enter": Enter sends and Shift+Enter is left to insert a newline', () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={1000} submitKey="enter" onSubmit={(t) => sent.push(t)} />,
    );
    typeInto(textarea(host), "hello");

    // Shift+Enter is NOT claimed, so the textarea inserts its newline natively.
    expect(press(textarea(host), { key: "Enter", shiftKey: true })).toBe(false);
    expect(sent).toEqual([]);

    expect(press(textarea(host), { key: "Enter" })).toBe(true);
    expect(sent).toEqual(["hello"]);
  });

  it('"enter" leaves an IME-confirming Enter alone', () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={1000} submitKey="enter" onSubmit={(t) => sent.push(t)} />,
    );
    typeInto(textarea(host), "kana");

    press(textarea(host), { key: "Enter", isComposing: true });
    expect(sent).toEqual([]);
  });

  it('"enter" works with the inline editor too: Shift+Enter breaks the line', () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput
        budgetTokens={1000}
        submitKey="enter"
        pasteThreshold={500}
        defaultValue="inline"
        onSubmit={(t) => sent.push(t)}
      />,
    );
    const editor = host.querySelector("[data-react-fancy-composer-input]")!;

    press(editor, { key: "Enter", shiftKey: true });
    expect(sent).toEqual([]);

    press(editor, { key: "Enter" });
    // The Shift+Enter newline is in what was sent: it broke the line, it did not send.
    expect(sent).toEqual(["inline\n"]);
  });

  it("the hint and default placeholder name the key that actually sends", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} submitKey="enter" platform="generic" onSubmit={() => {}} />,
    );

    const hint = host.querySelector("[data-react-fancy-prompt-input-hint]")!;
    expect(hint.textContent).toContain("Enter");
    expect(hint.textContent).not.toContain("Ctrl");
    expect(textarea(host).placeholder).not.toContain("Ctrl");
    expect(textarea(host).placeholder).toContain("Enter to send");
  });

  it("the icon send button's tooltip and name derive from submitKey", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={1000}
        sendButton="icon"
        submitKey="enter"
        platform="generic"
        onSubmit={() => {}}
      />,
    );
    const button = host.querySelector("[data-react-fancy-prompt-input-send]")!;

    expect(button.getAttribute("aria-label")).toContain("Enter");
    expect(button.getAttribute("aria-label")).not.toContain("Ctrl");
    expect(button.getAttribute("aria-keyshortcuts")).toBe("Enter");
    const tip = hover(button)!;
    expect(tip.textContent).toBe("Send · Enter");
  });

  it("mod+enter names the platform's modifier in the tooltip, name and keyshortcuts", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} sendButton="icon" platform="apple" onSubmit={() => {}} />,
    );
    const button = host.querySelector("[data-react-fancy-prompt-input-send]")!;

    expect(button.getAttribute("aria-label")).toContain("⌘+Enter");
    expect(button.getAttribute("aria-keyshortcuts")).toBe("Meta+Enter Control+Enter");
    expect(hover(button)!.textContent).toBe("Send · ⌘+Enter");
  });

  it("every word of the tooltip and name comes from labels", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={1000}
        sendButton="icon"
        submitKey="enter"
        labels={{
          sendTooltip: "Enviar · {shortcut}",
          sendAriaLabel: "Enviar ({shortcut})",
          shortcut: "Intro",
        }}
        onSubmit={() => {}}
      />,
    );
    const button = host.querySelector("[data-react-fancy-prompt-input-send]")!;

    expect(button.getAttribute("aria-label")).toBe("Enviar (Intro)");
    const tip = hover(button)!.textContent!;
    expect(tip).toBe("Enviar · Intro");
    expect(tip).not.toMatch(/Send|Enter/);
  });

  it("labels translate the label send button and the hint", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={1000}
        submitKey="enter"
        labels={{ send: "enviar", hint: "para enviar", enterKey: "Intro" }}
        onSubmit={() => {}}
      />,
    );
    const button = host.querySelector("[data-react-fancy-prompt-input-send]")!;
    const hint = host.querySelector("[data-react-fancy-prompt-input-hint]")!;

    expect(button.textContent).toContain("enviar");
    expect(hint.textContent).toBe("Intro para enviar");
  });
});
