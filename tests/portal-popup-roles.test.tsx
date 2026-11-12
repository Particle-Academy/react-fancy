// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { FIXTURES } from "./touch-density.fixtures";
import { EmojiSelect, Popover, Portal } from "../src";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Portalled popups and landmarks. Every popup below is portalled to <body>,
 * outside the page's landmarks, so axe's "region" rule looks at what sits
 * there. Before this fix each one was wrapped in a role-less
 * `<div data-react-fancy-portal style="display: contents">`, and some popups
 * (Popover content, the PhoneInput country picker, the EmojiSelect skin-tone
 * picker) had no role of their own either.
 *
 * Now the element the portal puts in <body> IS the popup: it carries the
 * popup's role (`menu`, `listbox` or `dialog`) and the `data-react-fancy-portal`
 * handle, with no role-less wrapper around it.
 */

const POPUP_ROLES = ["menu", "listbox", "dialog"];

let root: Root | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  document.documentElement.classList.remove("dark");
  vi.useRealTimers();
});

function mountFixture(name: string) {
  const f = FIXTURES.find((x) => x.name === name);
  if (!f) throw new Error(`no fixture ${name}`);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(f.render()));
  if (f.open) act(() => f.open!(host));
  return host;
}

/** What the portal put directly in <body>, besides the test's own host. */
function portalled(host: HTMLElement): Element[] {
  return [...document.body.children].filter((el) => el !== host);
}

const CASES: Array<[fixture: string, role: string]> = [
  ["Dropdown", "menu"],
  ["ContextMenu", "menu"],
  ["Popover", "dialog"],
  ["Select listbox open", "listbox"],
  ["Select multiple open", "listbox"],
  ["Autocomplete", "listbox"],
  ["ContentReaction size=md", "menu"],
  ["PhoneInput country list open", "dialog"],
];

describe("a portalled popup carries its own role, with no role-less wrapper", () => {
  for (const [name, role] of CASES) {
    it(`${name}: the element in <body> is role="${role}"`, () => {
      const host = mountFixture(name);
      const top = portalled(host);
      expect(top.length, `${name} portalled something`).toBe(1);
      const el = top[0];
      expect(el.getAttribute("role"), `${name}: ${el.outerHTML.slice(0, 160)}`).toBe(role);
      expect(POPUP_ROLES).toContain(el.getAttribute("role"));
      expect(el.hasAttribute("data-react-fancy-portal"), `${name}: the portal handle is on the popup`).toBe(true);
      expect(document.querySelectorAll("[data-react-fancy-portal]:not([role])").length, `${name}: no role-less wrapper`).toBe(0);
    });
  }

  it("Popover content honours a role the caller passes", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root!.render(
        <Popover haspopup="menu">
          <Popover.Trigger>
            <button type="button">Open</button>
          </Popover.Trigger>
          <Popover.Content role="menu">
            <button type="button" role="menuitem">One</button>
          </Popover.Content>
        </Popover>,
      ),
    );
    act(() => host.querySelector("button")!.click());
    const el = portalled(host)[0];
    expect(el.getAttribute("role")).toBe("menu");
    expect(el.hasAttribute("data-react-fancy-portal")).toBe(true);
  });

  it("the EmojiSelect skin-tone picker is a labelled dialog", () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(<EmojiSelect onChange={() => {}} />));
    act(() => host.querySelector<HTMLButtonElement>("[data-react-fancy-emoji-select] button")!.click());
    // A cell for a tonable emoji carries the amber dot; walk the categories to one that has it.
    const tonable = () => [...host.querySelectorAll("button")].find((b) => b.querySelector("span.bg-amber-400"));
    const categories = [...host.querySelectorAll<HTMLButtonElement>("button[aria-label]")].filter((b) => b.classList.contains("shrink-0"));
    for (const c of categories) {
      if (tonable()) break;
      act(() => c.click());
    }
    const cell = tonable();
    expect(cell, "a tonable emoji is shown").toBeTruthy();
    const ev = new MouseEvent("pointerover", { bubbles: true });
    Object.defineProperty(ev, "pointerType", { value: "mouse" });
    act(() => {
      cell!.dispatchEvent(ev);
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const top = portalled(host);
    expect(top.length, "the tone picker opened").toBe(1);
    expect(top[0].getAttribute("role")).toBe("dialog");
    expect(top[0].getAttribute("aria-label")).toMatch(/skin tone/i);
    expect(top[0].hasAttribute("data-react-fancy-portal")).toBe(true);
  });

  it("dark mode still reaches the popup: the `dark` class is on the popup itself", () => {
    document.documentElement.classList.add("dark");
    const host = mountFixture("Dropdown");
    const el = portalled(host)[0];
    expect(el.getAttribute("role")).toBe("menu");
    expect(el.classList.contains("dark")).toBe(true);
  });
});

describe("Portal portalContainer", () => {
  it("portals into the element a host passes, such as a landmark", () => {
    const main = document.createElement("main");
    document.body.append(main);
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root!.render(
        <Portal portalContainer={main}>
          <div role="menu" data-x="">
            item
          </div>
        </Portal>,
      ),
    );
    const menu = main.querySelector("[data-x]")!;
    expect(menu, "rendered inside <main>").toBeTruthy();
    expect(menu.parentElement).toBe(main);
    expect(menu.hasAttribute("data-react-fancy-portal")).toBe(true);
  });

  it("several children (no single element to carry the handle) keep a wrapper", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root!.render(
        <Portal>
          <span>a</span>
          <span>b</span>
        </Portal>,
      ),
    );
    const wrapper = portalled(host)[0];
    expect(wrapper.hasAttribute("data-react-fancy-portal")).toBe(true);
    expect(wrapper.children.length).toBe(2);
  });
});
