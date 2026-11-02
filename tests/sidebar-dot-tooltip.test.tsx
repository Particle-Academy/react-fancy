// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "../src/components/Sidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 6.2.0 — `Sidebar.Item` `dotTooltip`.
 *
 * `dotLabel` reached screen readers only, so a dot carrying real words
 * ("Phone paired, expires 3 Nov") told a sighted user nothing, and the item's
 * own collapsed `title` left the consumer no way to add one. `dotTooltip`
 * shows `dotLabel` in a Fancy `Tooltip` on hover AND keyboard focus of the
 * item. Screen readers already have the words in the name, so the bubble is
 * hidden from them and is not wired up as a description.
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
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const icon = <svg data-icon="" />;
const item = () => document.querySelector("[data-react-fancy-sidebar-item]") as HTMLElement;
const tip = () => document.querySelector("[role='tooltip']") as HTMLElement | null;

function accessibleName(el: HTMLElement): string {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[aria-hidden='true']").forEach((n) => n.remove());
  const text = (copy.textContent ?? "").replace(/\s+/g, " ").trim();
  return text || el.getAttribute("title") || "";
}

function settle() {
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

function hover(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  settle();
}

function unhover(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
  });
}

function focus(el: HTMLElement) {
  act(() => el.focus());
  settle();
}

const LABEL = "Phone paired, expires 3 Nov";

describe("opted in, expanded", () => {
  const tree = (
    <Sidebar>
      <Sidebar.Item icon={icon} dot dotLabel={LABEL} dotTooltip>Settings</Sidebar.Item>
    </Sidebar>
  );

  it("shows the dot's words on hover, and hides on leave", () => {
    mount(tree);
    expect(tip()).toBeNull();
    hover(item());
    expect(tip()).not.toBeNull();
    expect(tip()!.textContent).toBe(LABEL);
    unhover(item());
    expect(tip()).toBeNull();
  });

  it("shows on keyboard focus", () => {
    mount(tree);
    focus(item());
    expect(tip()!.textContent).toBe(LABEL);
  });

  it("screen readers hear the words once: in the name, not again from the bubble", () => {
    mount(tree);
    hover(item());
    expect(accessibleName(item())).toBe(`Settings ${LABEL}`);
    expect(item().hasAttribute("aria-describedby")).toBe(false);
    // The bubble's content is hidden from assistive tech, so a virtual cursor
    // reaching the portal does not read it a second time.
    const visible = tip()!.cloneNode(true) as HTMLElement;
    visible.querySelectorAll("[aria-hidden='true']").forEach((n) => n.remove());
    expect(visible.textContent).toBe("");
  });

  it("has no title, expanded, as before", () => {
    mount(tree);
    expect(item().hasAttribute("title")).toBe(false);
  });
});

describe("opted in, collapsed", () => {
  const tree = (
    <Sidebar collapsed>
      <Sidebar.Item icon={icon} dot dotLabel={LABEL} dotTooltip>Settings</Sidebar.Item>
    </Sidebar>
  );

  it("replaces the native title: the bubble carries the label AND the dot's words", () => {
    mount(tree);
    expect(item().hasAttribute("title")).toBe(false);
    hover(item());
    const label = tip()!.querySelector("[data-react-fancy-sidebar-tooltip-label]")!;
    expect(label.textContent).toBe("Settings");
    expect(tip()!.textContent).toBe(`Settings${LABEL}`);
  });

  it("shows on focus, and the item is still named once", () => {
    mount(tree);
    focus(item());
    expect(tip()).not.toBeNull();
    expect(accessibleName(item())).toBe(`Settings ${LABEL}`);
    expect(item().hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("not opted in", () => {
  it("no tooltip on hover or focus, and the collapsed title stays", () => {
    mount(
      <Sidebar collapsed>
        <Sidebar.Item icon={icon} dot dotLabel={LABEL}>Settings</Sidebar.Item>
      </Sidebar>,
    );
    hover(item());
    focus(item());
    expect(tip()).toBeNull();
    expect(item().getAttribute("title")).toBe("Settings");
  });

  it("dotTooltip without dotLabel, or without dot, does nothing", () => {
    mount(
      <Sidebar collapsed>
        <Sidebar.Item icon={icon} dot dotTooltip>Settings</Sidebar.Item>
        <Sidebar.Item icon={icon} dotLabel={LABEL} dotTooltip>Profile</Sidebar.Item>
      </Sidebar>,
    );
    const [a, b] = Array.from(document.querySelectorAll<HTMLElement>("[data-react-fancy-sidebar-item]"));
    hover(a);
    hover(b);
    expect(tip()).toBeNull();
    expect(a.getAttribute("title")).toBe("Settings");
    expect(b.getAttribute("title")).toBe("Profile");
  });

  it("markup at rest is identical with and without dotTooltip, expanded", () => {
    const html = (extra: boolean) =>
      renderToStaticMarkup(
        <Sidebar>
          <Sidebar.Item icon={icon} dot dotLabel={LABEL} dotTooltip={extra}>Settings</Sidebar.Item>
        </Sidebar>,
      );
    expect(html(true)).toBe(html(false));
  });
});

describe("keeps the item's own handlers", () => {
  it("a consumer onMouseEnter / onFocus still fire", () => {
    const enter = vi.fn();
    const onFocus = vi.fn();
    mount(
      <Sidebar>
        <Sidebar.Item
          icon={icon}
          dot
          dotLabel={LABEL}
          dotTooltip
          {...({ onMouseEnter: enter, onFocus } as Record<string, unknown>)}
        >
          Settings
        </Sidebar.Item>
      </Sidebar>,
    );
    hover(item());
    focus(item());
    expect(enter).toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalled();
    expect(tip()).not.toBeNull();
  });
});
