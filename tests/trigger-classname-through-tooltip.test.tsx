// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, forwardRef, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { Button, Dropdown, Popover, Tooltip } from "../src";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A Trigger's `className` when its child is a Tooltip.
 *
 * Since 6.23.0 `Popover.Trigger` / `Dropdown.Trigger` render no wrapper and
 * merge their props onto their child. With a Tooltip as that child, the
 * merged `className` landed on the Tooltip, whose `className` styles its
 * BUBBLE: the class silently styled the bubble instead of the button. A real
 * app lost `[-webkit-app-region:no-drag]` on a title-bar button this way, and
 * every click on Windows went to the drag region.
 */

let root: Root | null = null;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return host;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function showTooltip(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

function expectClassOnButtonNotBubble(host: HTMLElement) {
  const button = host.querySelector("button")!;
  expect(button.classList.contains("x"), "the button has the trigger's class").toBe(true);
  vi.useFakeTimers();
  showTooltip(button);
  const bubble = document.querySelector("[role=tooltip]");
  expect(bubble, "the tooltip opened").not.toBeNull();
  expect(bubble!.classList.contains("x"), "the bubble does not").toBe(false);
}

describe("Popover.Trigger className with a Tooltip child", () => {
  it("reaches the button, not the bubble", () => {
    const host = mount(
      <Popover>
        <Popover.Trigger className="x">
          <Tooltip content="t">
            <Button>Open</Button>
          </Tooltip>
        </Popover.Trigger>
        <Popover.Content>Panel</Popover.Content>
      </Popover>,
    );
    expectClassOnButtonNotBubble(host);
  });

  it("keeps the Tooltip's own className on the bubble and the child's own classes", () => {
    const host = mount(
      <Popover>
        <Popover.Trigger className="x">
          <Tooltip content="t" className="bubble-class">
            <button type="button" className="own">Open</button>
          </Tooltip>
        </Popover.Trigger>
        <Popover.Content>Panel</Popover.Content>
      </Popover>,
    );
    const button = host.querySelector("button")!;
    expect(button.classList.contains("x")).toBe(true);
    expect(button.classList.contains("own")).toBe(true);
    expect(button.classList.contains("bubble-class")).toBe(false);
    vi.useFakeTimers();
    showTooltip(button);
    const bubble = document.querySelector("[role=tooltip]")!;
    expect(bubble.classList.contains("bubble-class")).toBe(true);
    expect(bubble.classList.contains("x")).toBe(false);
  });

  it("an arbitrary-value class survives intact (the title-bar case)", () => {
    const host = mount(
      <Popover>
        <Popover.Trigger className="[-webkit-app-region:no-drag]">
          <Tooltip content="t">
            <Button>Open</Button>
          </Tooltip>
        </Popover.Trigger>
        <Popover.Content>Panel</Popover.Content>
      </Popover>,
    );
    expect(host.querySelector("button")!.classList.contains("[-webkit-app-region:no-drag]")).toBe(true);
  });

  it("style reaches the button", () => {
    const host = mount(
      <Popover>
        <Popover.Trigger style={{ marginTop: "3px" }}>
          <Tooltip content="t">
            <Button>Open</Button>
          </Tooltip>
        </Popover.Trigger>
        <Popover.Content>Panel</Popover.Content>
      </Popover>,
    );
    expect(host.querySelector("button")!.style.marginTop).toBe("3px");
  });
});

describe("Dropdown.Trigger className with a Tooltip child", () => {
  it("reaches the button, not the bubble", () => {
    const host = mount(
      <Dropdown>
        <Dropdown.Trigger className="x">
          <Tooltip content="t">
            <Button>Options</Button>
          </Tooltip>
        </Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item onClick={() => {}}>Edit</Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>,
    );
    expectClassOnButtonNotBubble(host);
  });

  it("reaches a plain button child, joined with its own classes", () => {
    const host = mount(
      <Dropdown>
        <Dropdown.Trigger className="x">
          <button type="button" className="own">Options</button>
        </Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item onClick={() => {}}>Edit</Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>,
    );
    const button = host.querySelector("button")!;
    expect(button.classList.contains("x")).toBe(true);
    expect(button.classList.contains("own")).toBe(true);
  });
});

describe("Tooltip triggerClassName", () => {
  it("goes to the child, joined with its own className", () => {
    const host = mount(
      <Tooltip content="t" triggerClassName="tc">
        <button type="button" className="own">Go</button>
      </Tooltip>,
    );
    const button = host.querySelector("button")!;
    expect(button.classList.contains("tc")).toBe(true);
    expect(button.classList.contains("own")).toBe(true);
  });
});

describe("dev warning when a Trigger's className misses the root element", () => {
  // A component whose className styles something other than the element its
  // ref reaches: the class cannot land where the caller meant it to.
  const Misrouting = forwardRef<HTMLButtonElement, { className?: string; children?: ReactNode }>(
    function Misrouting({ className, children, ...rest }, ref) {
      return (
        <button type="button" ref={ref} {...rest}>
          <span className={className}>{children}</span>
        </button>
      );
    },
  );

  it("warns for Popover.Trigger", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(
      <Popover>
        <Popover.Trigger className="x">
          <Misrouting>Open</Misrouting>
        </Popover.Trigger>
        <Popover.Content>Panel</Popover.Content>
      </Popover>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("Popover.Trigger");
  });

  it("warns for Dropdown.Trigger", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(
      <Dropdown>
        <Dropdown.Trigger className="x">
          <Misrouting>Open</Misrouting>
        </Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item onClick={() => {}}>Edit</Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("Dropdown.Trigger");
  });

  it("does not warn when the class lands on the element (Tooltip, Button, wrapper)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(
      <div>
        <Popover>
          <Popover.Trigger className="x">
            <Tooltip content="t">
              <Button>Open</Button>
            </Tooltip>
          </Popover.Trigger>
          <Popover.Content>Panel</Popover.Content>
        </Popover>
        <Dropdown>
          <Dropdown.Trigger className="x">
            <Button>Options</Button>
          </Dropdown.Trigger>
          <Dropdown.Items>
            <Dropdown.Item onClick={() => {}}>Edit</Dropdown.Item>
          </Dropdown.Items>
        </Dropdown>
        <Popover>
          <Popover.Trigger className="x">plain text</Popover.Trigger>
          <Popover.Content>Panel</Popover.Content>
        </Popover>
      </div>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
