// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { Button, Dropdown, Popover, Tooltip } from "../src";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A Tooltip used as the child of `Dropdown.Trigger` or `Popover.Trigger`.
 *
 * Since 6.23.0 the triggers merge their props (onClick, onKeyDown, the popup
 * ARIA, the stable handle) and their ref onto their child instead of wrapping
 * it. With a Tooltip as that child, the props landed on the Tooltip, which
 * read only its own props and ignored its ref: the click never reached the
 * button, so the menu never opened, and the button announced no popup.
 * Tooltip now forwards every prop it does not use, and its ref, to its own
 * child, composing handlers so both the trigger's and the child's run.
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
});

function hover(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

describe("Tooltip inside Dropdown.Trigger", () => {
  const tree = (onOwnClick = () => {}) => (
    <Dropdown>
      <Dropdown.Trigger>
        <Tooltip content="More actions">
          <Button onClick={onOwnClick}>Options</Button>
        </Tooltip>
      </Dropdown.Trigger>
      <Dropdown.Items>
        <Dropdown.Item onClick={() => {}}>Edit</Dropdown.Item>
      </Dropdown.Items>
    </Dropdown>
  );

  it("a click on the button opens the menu", () => {
    const host = mount(tree());
    const button = host.querySelector("button")!;
    act(() => button.click());
    expect(document.querySelector("[role=menu]"), "the menu opened").not.toBeNull();
  });

  it("the button carries the trigger's ARIA and handle", () => {
    const host = mount(tree());
    const button = host.querySelector("button")!;
    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.hasAttribute("data-react-fancy-dropdown-trigger")).toBe(true);
    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe(document.querySelector("[role=menu]")!.id);
  });

  it("the child's own onClick still runs, once, alongside the trigger's", () => {
    const own = vi.fn();
    const host = mount(tree(own));
    act(() => host.querySelector("button")!.click());
    expect(own).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[role=menu]")).not.toBeNull();
  });

  it("ArrowDown on the button opens the menu (the trigger's onKeyDown arrives)", () => {
    const host = mount(tree());
    const button = host.querySelector("button")!;
    act(() => {
      button.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    });
    expect(document.querySelector("[role=menu]")).not.toBeNull();
  });

  it("the tooltip still shows on hover and describes the button", () => {
    vi.useFakeTimers();
    const host = mount(tree());
    const button = host.querySelector("button")!;
    hover(button);
    const tip = document.querySelector("[role=tooltip]")!;
    expect(tip?.textContent).toContain("More actions");
    expect(button.getAttribute("aria-describedby")).toBe(tip.id);
  });

  it("the menu is anchored: the trigger's ref reached the button", () => {
    // The trigger measures its anchor from the ref; if the ref is dropped the
    // menu has no anchor. Observable here through the Dropdown focusing back
    // to the trigger on Escape.
    const host = mount(tree());
    const button = host.querySelector("button")!;
    act(() => button.click());
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(document.querySelector("[role=menu]")).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});

describe("Tooltip inside Popover.Trigger", () => {
  it("a click opens the popover and the button announces it", () => {
    const host = mount(
      <Popover>
        <Popover.Trigger>
          <Tooltip content="Filters">
            <button type="button">Filter</button>
          </Tooltip>
        </Popover.Trigger>
        <Popover.Content>
          <p>Body</p>
        </Popover.Content>
      </Popover>,
    );
    const button = host.querySelector("button")!;
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.hasAttribute("data-react-fancy-popover-trigger")).toBe(true);
    act(() => button.click());
    expect(document.querySelector("[data-react-fancy-popover]"), "the popover opened").not.toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("Tooltip forwards its ref and unknown props to its child", () => {
  it("ref", () => {
    const ref = createRef<HTMLElement>();
    const host = mount(
      <Tooltip ref={ref} content="x">
        <button type="button">B</button>
      </Tooltip>,
    );
    expect(ref.current).toBe(host.querySelector("button"));
  });

  it("the child's own ref still gets the element too", () => {
    const outer = createRef<HTMLElement>();
    const inner = createRef<HTMLButtonElement>();
    const host = mount(
      <Tooltip ref={outer} content="x">
        <button ref={inner} type="button">
          B
        </button>
      </Tooltip>,
    );
    const button = host.querySelector("button")!;
    expect(outer.current).toBe(button);
    expect(inner.current).toBe(button);
  });

  it("data-* and aria-* props, with the child's own value winning on a clash", () => {
    const host = mount(
      <Tooltip content="x" data-handle="h" aria-label="From outside" title="t">
        <button type="button" title="own">
          B
        </button>
      </Tooltip>,
    );
    const button = host.querySelector("button")!;
    expect(button.getAttribute("data-handle")).toBe("h");
    expect(button.getAttribute("aria-label")).toBe("From outside");
    expect(button.getAttribute("title")).toBe("own");
  });

  it("className stays the tooltip bubble's, not the child's", () => {
    vi.useFakeTimers();
    const host = mount(
      <Tooltip content="x" className="bubble-class">
        <button type="button">B</button>
      </Tooltip>,
    );
    const button = host.querySelector("button")!;
    expect(button.classList.contains("bubble-class")).toBe(false);
    hover(button);
    expect(document.querySelector("[role=tooltip]")!.classList.contains("bubble-class")).toBe(true);
  });
});
