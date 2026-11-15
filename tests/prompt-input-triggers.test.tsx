// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { PromptInput, type PromptTrigger } from "../src/components/PromptInput/PromptInput";

vi.setConfig({ testTimeout: 20_000 });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `triggers` (CC-fancy-0042): app-defined pickers beyond `/` and `@`. MOIC's
 * composer has six (`@` prospect, `#` file, `/` prompt, `$` deal, `&` op, and a
 * backtick for a skill), each with its own async source and the text a chosen
 * item serialises to. Without this they were hand-rolled beside PromptInput.
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
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  document.body.replaceChildren();
});

const ta = (host: HTMLElement) => host.querySelector<HTMLTextAreaElement>("[data-react-fancy-prompt-input-textarea]")!;
const menu = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-prompt-input-menu]");
const options = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("[data-react-fancy-prompt-input-menu-item]")];

function typeInto(el: HTMLTextAreaElement, text: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    set.call(el, text);
    el.setSelectionRange(text.length, text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function key(el: Element, k: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));

const deals: PromptTrigger = {
  char: "$",
  label: "Deals",
  search: (q) => [
    { id: "7", label: "Acme renewal", description: "Won" },
    { id: "9", label: "Acme expansion" },
    { id: "11", label: "Globex" },
  ].filter((d) => d.label.toLowerCase().includes(q.toLowerCase())),
  serialize: (d) => `[deal:${d.id}|${d.label}]`,
};

describe("PromptInput triggers", () => {
  it("opens the app's picker on its character and filters by the query", async () => {
    const { host } = mount(<PromptInput budgetTokens={0} onSubmit={() => {}} triggers={[deals]} />);
    typeInto(ta(host), "see $acme");
    await flush();
    expect(menu(host)?.getAttribute("data-react-fancy-prompt-input-menu")).toBe("trigger");
    expect(menu(host)?.getAttribute("data-react-fancy-prompt-input-trigger")).toBe("$");
    expect(options(host).map((o) => o.getAttribute("data-react-fancy-prompt-input-menu-item"))).toEqual(["7", "9"]);
    expect(host.querySelector('[role="listbox"]')?.getAttribute("aria-label")).toBe("Deals");
  });

  it("inserts the item's serialised text, then a space", async () => {
    const onChange = vi.fn();
    const { host } = mount(<PromptInput budgetTokens={0} onSubmit={() => {}} onChange={onChange} triggers={[deals]} />);
    typeInto(ta(host), "see $glo");
    await flush();
    key(ta(host), "Enter");
    expect(onChange).toHaveBeenLastCalledWith("see [deal:11|Globex] ");
  });

  it("waits for an async source and drops a stale answer", async () => {
    const resolvers: Record<string, (items: { id: string; label: string }[]) => void> = {};
    const slow: PromptTrigger = {
      char: "#",
      search: (q) => new Promise((resolve) => (resolvers[q] = resolve)),
    };
    const { host } = mount(<PromptInput budgetTokens={0} onSubmit={() => {}} triggers={[slow]} />);
    typeInto(ta(host), "#a");
    typeInto(ta(host), "#ab");
    await act(async () => resolvers["ab"]?.([{ id: "ab.ts", label: "ab.ts" }]));
    await act(async () => resolvers["a"]?.([{ id: "a.ts", label: "a.ts" }]));
    await flush();
    expect(options(host).map((o) => o.getAttribute("data-react-fancy-prompt-input-menu-item"))).toEqual(["ab.ts"]);
  });

  it("by default the item serialises as its character and id", async () => {
    const onChange = vi.fn();
    const plain: PromptTrigger = { char: "&", search: () => [{ id: "op-1", label: "Op 1" }] };
    const { host } = mount(<PromptInput budgetTokens={0} onSubmit={() => {}} onChange={onChange} triggers={[plain]} />);
    typeInto(ta(host), "&");
    await flush();
    key(ta(host), "Tab");
    expect(onChange).toHaveBeenLastCalledWith("&op-1 ");
  });

  it("opens only at a word start unless the trigger says otherwise", async () => {
    const { host } = mount(<PromptInput budgetTokens={0} onSubmit={() => {}} triggers={[deals]} />);
    typeInto(ta(host), "US$5");
    await flush();
    expect(menu(host)).toBeNull();
  });

  it("a trigger for @ replaces the built-in mention picker; / still opens commands", async () => {
    const people: PromptTrigger = { char: "@", search: () => [{ id: "p1", label: "Prospect One" }] };
    const { host } = mount(
      <PromptInput budgetTokens={0} onSubmit={() => {}} triggers={[people]} mentions={[{ id: "ada", name: "Ada", kind: "person" }]} commands={[{ name: "/help", hint: "Help" }]} />,
    );
    typeInto(ta(host), "@");
    await flush();
    expect(options(host).map((o) => o.getAttribute("data-react-fancy-prompt-input-menu-item"))).toEqual(["p1"]);
    typeInto(ta(host), "/");
    await flush();
    expect(menu(host)?.getAttribute("data-react-fancy-prompt-input-menu")).toBe("cmd");
  });

  it("Escape closes it, and a source that throws shows nothing instead of breaking the input", async () => {
    const broken: PromptTrigger = { char: "$", search: () => Promise.reject(new Error("down")) };
    const { host } = mount(<PromptInput budgetTokens={0} onSubmit={() => {}} triggers={[broken, { ...deals, char: "~" }]} />);
    typeInto(ta(host), "$x");
    await flush();
    expect(menu(host)).toBeNull();
    typeInto(ta(host), "~");
    await flush();
    expect(menu(host)).not.toBeNull();
    key(ta(host), "Escape");
    expect(menu(host)).toBeNull();
  });

  it("without triggers nothing changes: $ is plain text", async () => {
    const { host } = mount(<PromptInput budgetTokens={0} onSubmit={() => {}} />);
    typeInto(ta(host), "$acme");
    await flush();
    expect(menu(host)).toBeNull();
  });
});
