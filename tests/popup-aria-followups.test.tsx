// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Tooltip } from "../src/components/Tooltip";
import { Breadcrumbs } from "../src/components/Breadcrumbs";
import { Popover } from "../src/components/Popover";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Popup ARIA follow-ups to the trigger fix (6.22.2): the Tooltip trigger names
 * its tooltip, the collapsed Breadcrumbs menu button says what it opens, and a
 * Popover no longer announces every panel as a menu.
 */

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  cleanups.push(() => act(() => root.unmount()));
  return host;
}

describe("Tooltip: the trigger is described by the tooltip while it is shown", () => {
  const tooltip = () => document.querySelector<HTMLElement>("[data-react-fancy-tooltip]");

  function show(el: HTMLElement) {
    act(() => el.focus());
    act(() => {
      vi.advanceTimersByTime(500);
    });
  }

  it("sets aria-describedby to the role=tooltip element's id, and removes it when hidden", () => {
    vi.useFakeTimers();
    mount(
      <Tooltip content="Save the draft">
        <button type="button" data-testid="t">
          Save
        </button>
      </Tooltip>,
    );
    const button = document.querySelector<HTMLButtonElement>('[data-testid="t"]')!;
    expect(button.hasAttribute("aria-describedby")).toBe(false);

    show(button);
    const tip = tooltip()!;
    expect(tip).not.toBeNull();
    expect(tip.getAttribute("role")).toBe("tooltip");
    expect(tip.id).not.toBe("");
    expect(button.getAttribute("aria-describedby")).toBe(tip.id);
    expect(document.getElementById(button.getAttribute("aria-describedby")!)).toBe(tip);

    act(() => button.blur());
    expect(tooltip()).toBeNull();
    expect(button.hasAttribute("aria-describedby")).toBe(false);
  });

  it("keeps the child's own aria-describedby and adds the tooltip's to it", () => {
    vi.useFakeTimers();
    mount(
      <>
        <span id="hint">Ctrl+S</span>
        <Tooltip content="Save the draft">
          <button type="button" data-testid="t" aria-describedby="hint">
            Save
          </button>
        </Tooltip>
      </>,
    );
    const button = document.querySelector<HTMLButtonElement>('[data-testid="t"]')!;
    expect(button.getAttribute("aria-describedby")).toBe("hint");

    show(button);
    expect(button.getAttribute("aria-describedby")).toBe(`hint ${tooltip()!.id}`);

    act(() => button.blur());
    expect(button.getAttribute("aria-describedby")).toBe("hint");
  });

  it("describe={false} leaves the trigger undescribed (a bubble repeating the name)", () => {
    vi.useFakeTimers();
    mount(
      <Tooltip content="Save" describe={false}>
        <button type="button" data-testid="t">
          Save
        </button>
      </Tooltip>,
    );
    const button = document.querySelector<HTMLButtonElement>('[data-testid="t"]')!;
    show(button);
    expect(tooltip()!.getAttribute("role")).toBe("tooltip");
    expect(button.hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("Breadcrumbs collapsed dropdown: a disclosure button", () => {
  // A disclosure, not a menu button: the panel is a plain list of links, with
  // no role="menu" and no menu keyboard model, so announcing "menu" would
  // promise screen-reader users semantics that are not there.
  it("carries a toggling aria-expanded and aria-controls naming the panel, and NO aria-haspopup", () => {
    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/projects">Projects</Breadcrumbs.Item>
        <Breadcrumbs.Item active>Settings</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const dropdown = document.querySelector<HTMLElement>("[data-react-fancy-breadcrumbs-dropdown]")!;
    const button = dropdown.querySelector<HTMLButtonElement>("button")!;

    expect(button.hasAttribute("aria-haspopup")).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.hasAttribute("aria-controls")).toBe(false);
    // The wrapper it sits in carries none of it.
    expect(dropdown.hasAttribute("aria-haspopup")).toBe(false);
    expect(dropdown.hasAttribute("aria-expanded")).toBe(false);

    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.hasAttribute("aria-haspopup")).toBe(false);
    expect(document.querySelector("[aria-haspopup]")).toBeNull();
    const panel = document.querySelector<HTMLElement>("[data-react-fancy-breadcrumbs-dropdown-menu]")!;
    expect(panel).not.toBeNull();
    expect(panel.id).not.toBe("");
    expect(button.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.textContent).toContain("Projects");

    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.hasAttribute("aria-controls")).toBe(false);
  });
});

describe("Popover: aria-haspopup says what kind of popup it is", () => {
  function pop(props: { haspopup?: "menu" | "listbox" | "dialog" | "tree" | "grid" }) {
    mount(
      <Popover {...props}>
        <Popover.Trigger>
          <button type="button" data-testid="pop">
            Fill
          </button>
        </Popover.Trigger>
        <Popover.Content>colours</Popover.Content>
      </Popover>,
    );
    return document.querySelector<HTMLButtonElement>('[data-testid="pop"]')!;
  }

  it('defaults to "dialog", not "true" (which means a menu)', () => {
    expect(pop({}).getAttribute("aria-haspopup")).toBe("dialog");
  });

  it.each(["menu", "listbox", "tree", "grid"] as const)("haspopup=%s is passed through", (kind) => {
    expect(pop({ haspopup: kind }).getAttribute("aria-haspopup")).toBe(kind);
  });

  it("a text child's own button takes the same value", () => {
    mount(
      <Popover haspopup="listbox">
        <Popover.Trigger>Choose</Popover.Trigger>
        <Popover.Content>options</Popover.Content>
      </Popover>,
    );
    const trigger = document.querySelector("[data-react-fancy-popover-trigger]")!;
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
  });
});
