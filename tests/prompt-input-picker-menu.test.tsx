// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

// ~1s alone, but the full suite now compiles Tailwind in several files and the
// 5s default timed out here under that load. Not a behaviour change.
vi.setConfig({ testTimeout: 20_000 });

import {
  PromptInput,
  type PromptCmd,
  type PromptMention,
} from "../src/components/PromptInput/PromptInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The `/` and `@` picker menu: the active row must stay in view, and no row may
 * make the menu scroll sideways.
 *
 * Reported by the Genie agent. With 120 commands, ArrowDown moved the highlight
 * off the bottom of the `max-h-56` list and nothing brought it back. And a long
 * unbroken command name or hint (`/claude-code-setup:claude-automation-recommender`)
 * pushed the `w-72` menu into a horizontal scrollbar.
 *
 * jsdom does no layout, so these tests pin the two things that cause the
 * behaviour: who gets `scrollIntoView`, and whether every piece of row text
 * sits in an element allowed to break or truncate. The real layout is checked
 * in a headless browser before release.
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

/** Each element `scrollIntoView` was called on, in order. */
let scrolled: Element[] = [];

beforeEach(() => {
  scrolled = [];
  // jsdom has no layout, so it has no scrollIntoView either.
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = vi.fn(function (
    this: Element,
  ) {
    scrolled.push(this);
  });
});

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

function textarea(host: HTMLElement): HTMLTextAreaElement {
  return host.querySelector("[data-react-fancy-prompt-input-textarea]")!;
}

function typeInto(ta: HTMLTextAreaElement, text: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    set.call(ta, text);
    ta.setSelectionRange(text.length, text.length);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function key(target: Element, k: string) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

function menu(host: HTMLElement): HTMLElement | null {
  return host.querySelector("[data-react-fancy-prompt-input-menu]");
}

function rows(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>("[data-react-fancy-prompt-input-menu-item]"));
}

function activeRow(host: HTMLElement): HTMLElement | undefined {
  return rows(host).find((r) => r.getAttribute("aria-selected") === "true");
}

const COMMANDS: PromptCmd[] = Array.from({ length: 120 }, (_, i) => ({
  name: `/cmd-${String(i).padStart(3, "0")}`,
  hint: `Command number ${i}`,
}));

const MENTIONS: PromptMention[] = [
  { id: "a", name: "Ada", kind: "user" },
  { id: "b", name: "Babbage", kind: "user" },
  { id: "c", name: "Countess-of-Lovelace-with-a-very-long-unbroken-handle", kind: "file" },
];

describe("PromptInput picker: stable handles", () => {
  it("marks the menu, its rows, and the active row", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} commands={COMMANDS} onSubmit={() => {}} />);
    expect(menu(host)).toBeNull();

    typeInto(textarea(host), "/");

    expect(menu(host)).not.toBeNull();
    expect(menu(host)!.getAttribute("data-react-fancy-prompt-input-menu")).toBe("cmd");
    expect(rows(host)).toHaveLength(120);
    expect(rows(host)[0].getAttribute("data-react-fancy-prompt-input-menu-item")).toBe("/cmd-000");
    expect(rows(host)[0].getAttribute("role")).toBe("option");
    expect(rows(host).filter((r) => r.getAttribute("aria-selected") === "true")).toEqual([rows(host)[0]]);
    expect(rows(host)[1].getAttribute("aria-selected")).toBe("false");
  });

  it("names mention rows by id and the menu by kind", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} mentions={MENTIONS} onSubmit={() => {}} />);
    typeInto(textarea(host), "@");
    expect(menu(host)!.getAttribute("data-react-fancy-prompt-input-menu")).toBe("mention");
    expect(rows(host).map((r) => r.getAttribute("data-react-fancy-prompt-input-menu-item"))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("PromptInput picker: the active row is kept in view", () => {
  it("scrolls each row ArrowDown lands on into view, through to the last of 120", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} commands={COMMANDS} onSubmit={() => {}} />);
    const ta = textarea(host);
    typeInto(ta, "/");

    for (let i = 1; i < COMMANDS.length; i++) {
      key(ta, "ArrowDown");
      expect(activeRow(host)).toBe(rows(host)[i]);
      expect(scrolled.at(-1)).toBe(rows(host)[i]);
    }
    expect(activeRow(host)!.getAttribute("data-react-fancy-prompt-input-menu-item")).toBe("/cmd-119");
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest" });
  });

  it("scrolls the row ArrowUp lands on into view", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} commands={COMMANDS} onSubmit={() => {}} />);
    const ta = textarea(host);
    typeInto(ta, "/");
    for (let i = 0; i < 10; i++) key(ta, "ArrowDown");

    key(ta, "ArrowUp");
    expect(activeRow(host)).toBe(rows(host)[9]);
    expect(scrolled.at(-1)).toBe(rows(host)[9]);
  });

  it("brings the first row back into view when typing filters the list", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} commands={COMMANDS} onSubmit={() => {}} />);
    const ta = textarea(host);
    typeInto(ta, "/");
    for (let i = 0; i < 50; i++) key(ta, "ArrowDown");
    scrolled = [];

    typeInto(ta, "/cmd-1");

    expect(rows(host)[0].getAttribute("data-react-fancy-prompt-input-menu-item")).toBe("/cmd-100");
    expect(activeRow(host)).toBe(rows(host)[0]);
    expect(scrolled.at(-1)).toBe(rows(host)[0]);
  });

  it("keeps the mention highlight in view too", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} mentions={MENTIONS} onSubmit={() => {}} />);
    const ta = textarea(host);
    typeInto(ta, "@");
    key(ta, "ArrowDown");
    key(ta, "ArrowDown");
    expect(scrolled.at(-1)).toBe(rows(host)[2]);
  });

  it("does not scroll the list under a pointer that hovers a row", () => {
    // Scrolling a hovered, half-visible row into view moves the next row under
    // the pointer, which then hovers it: the list would crawl by itself.
    const { host } = mount(<PromptInput budgetTokens={1000} commands={COMMANDS} onSubmit={() => {}} />);
    typeInto(textarea(host), "/");
    scrolled = [];

    act(() => {
      rows(host)[5].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(activeRow(host)).toBe(rows(host)[5]);
    expect(scrolled).toEqual([]);
  });
});

/**
 * The shape Genie's acceptance test reads: every text node in a menu row sits
 * in an element allowed to break or truncate a long token.
 */
const BREAKS =
  /(^|\s)(truncate|break-all|break-words|wrap-break-word|wrap-anywhere|\[overflow-wrap:(anywhere|break-word)\]|\[word-break:[a-z-]+\])(\s|$)/;

function textParents(li: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if ((n.textContent ?? "").trim() === "") continue;
    out.push(n.parentElement!);
  }
  return out;
}

function breaks(el: HTMLElement): boolean {
  const style = el.getAttribute("style") ?? "";
  return (
    BREAKS.test(el.className) ||
    /overflow-wrap|word-break|text-overflow:\s*ellipsis/.test(style)
  );
}

describe("PromptInput picker: no row can scroll the menu sideways", () => {
  const LONG: PromptCmd[] = [
    {
      name: "/claude-code-setup:claude-automation-recommender",
      hint: "C:/Users/someone/AppData/Local/a/very/long/path/with/no/spaces/at/all/anywhere.json",
    },
  ];

  it("puts every piece of command row text in an element that breaks long tokens", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} commands={LONG} onSubmit={() => {}} />);
    typeInto(textarea(host), "/");
    const li = rows(host)[0];
    const parents = textParents(li);
    expect(parents.length).toBeGreaterThanOrEqual(2);
    for (const p of parents) expect(breaks(p), p.outerHTML).toBe(true);
  });

  it("puts every piece of mention row text in an element that breaks or truncates", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} mentions={MENTIONS} onSubmit={() => {}} />);
    typeInto(textarea(host), "@");
    for (const li of rows(host)) {
      const parents = textParents(li);
      expect(parents.length).toBe(2);
      for (const p of parents) {
        expect(breaks(p), p.outerHTML).toBe(true);
        // A flex item does not shrink below its content without this.
        expect(p.className.split(/\s+/)).toContain("min-w-0");
      }
    }
  });

  it("keeps a truncated mention name whole for a hover and for assistive tech", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} mentions={MENTIONS} onSubmit={() => {}} />);
    typeInto(textarea(host), "@");
    const long = MENTIONS[2];
    const name = textParents(rows(host)[2])[0];
    expect(name.className).toContain("truncate");
    expect(name.getAttribute("title")).toBe(long.name);
    // Truncation is visual: the whole name is still the text, so it is read out.
    expect(name.textContent).toBe(long.name);
    expect(rows(host)[2].getAttribute("aria-label") ?? rows(host)[2].textContent).toContain(long.name);
  });
});
