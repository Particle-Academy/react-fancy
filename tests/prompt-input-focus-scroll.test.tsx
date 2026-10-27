// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { PromptInput, type PromptInputHandle } from "../src/components/PromptInput/PromptInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A host focusing the composer must not scroll the page — genie#1290.
 *
 * `el.focus()` with no options lets the browser scroll EVERY scrollable
 * ancestor, up to the document, to reveal the element. In Genie's Electron
 * window that scrolled the whole window. A focus the host asks for (the
 * `focus()` handle, `setDraft(..., { focus: true })`) now passes
 * `{ preventScroll: true }` unless the host opts back in.
 *
 * jsdom does not scroll, so these assert what `focus` was CALLED with.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root: Root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host };
}

afterEach(() => {
  vi.restoreAllMocks();
  while (mounted.length) mounted.pop()!();
  document.body.replaceChildren();
});

function composer(host: HTMLElement, mode: "textarea" | "inline"): HTMLElement {
  return mode === "inline"
    ? host.querySelector<HTMLElement>("[data-react-fancy-composer-input]")!
    : host.querySelector("textarea")!;
}

/** The options of every `focus()` call made ON `el`. */
function focusCallsOn(spy: ReturnType<typeof vi.spyOn>, el: HTMLElement): unknown[] {
  const out: unknown[] = [];
  spy.mock.contexts.forEach((ctx, i) => {
    if (ctx === el) out.push(spy.mock.calls[i][0]);
  });
  return out;
}

const DRAFT = { v: 1 as const, text: "go", pills: [], attachments: [] };

for (const mode of ["textarea", "inline"] as const) {
  const extra = mode === "inline" ? { pasteThreshold: 500 } : {};

  describe(`PromptInput (${mode}) — programmatic focus does not scroll the page`, () => {
    it("focus() passes { preventScroll: true }", () => {
      const handle = createRef<PromptInputHandle>();
      const { host } = mount(<PromptInput ref={handle} budgetTokens={1000} {...extra} onSubmit={() => {}} />);
      const spy = vi.spyOn(HTMLElement.prototype, "focus");

      act(() => handle.current!.focus());

      const el = composer(host, mode);
      expect(document.activeElement).toBe(el);
      expect(focusCallsOn(spy, el)).toEqual([{ preventScroll: true }]);
    });

    it("setDraft(draft, { focus: true }) passes { preventScroll: true }", () => {
      const handle = createRef<PromptInputHandle>();
      const { host } = mount(<PromptInput ref={handle} budgetTokens={1000} {...extra} onSubmit={() => {}} />);
      const spy = vi.spyOn(HTMLElement.prototype, "focus");

      act(() => handle.current!.setDraft(DRAFT, { focus: true }));

      const el = composer(host, mode);
      expect(document.activeElement).toBe(el);
      expect(focusCallsOn(spy, el)).toEqual([{ preventScroll: true }]);
    });

    it("a host can opt back in: focus({ preventScroll: false })", () => {
      const handle = createRef<PromptInputHandle>();
      const { host } = mount(<PromptInput ref={handle} budgetTokens={1000} {...extra} onSubmit={() => {}} />);
      const spy = vi.spyOn(HTMLElement.prototype, "focus");

      act(() => handle.current!.focus({ preventScroll: false }));

      expect(focusCallsOn(spy, composer(host, mode))).toEqual([{ preventScroll: false }]);
    });

    it("a host can opt back in: setDraft(draft, { focus: true, preventScroll: false })", () => {
      const handle = createRef<PromptInputHandle>();
      const { host } = mount(<PromptInput ref={handle} budgetTokens={1000} {...extra} onSubmit={() => {}} />);
      const spy = vi.spyOn(HTMLElement.prototype, "focus");

      act(() => handle.current!.setDraft(DRAFT, { focus: true, preventScroll: false }));

      expect(focusCallsOn(spy, composer(host, mode))).toEqual([{ preventScroll: false }]);
    });
  });
}
