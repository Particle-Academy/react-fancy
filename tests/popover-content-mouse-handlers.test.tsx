// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Popover } from "../src/components/Popover";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Popover.Content spread the caller's props, then set
 * `onMouseEnter={hover ? onHoverEnter : undefined}` (and the same for leave)
 * AFTER the spread. With `hover` off, a consumer's own handlers were replaced
 * with undefined and never ran; with it on, they were replaced by the hover
 * handler. Both must now run.
 */

const mounted: Array<() => void> = [];

// Unmount in afterEach, so a failed assertion cannot leak a portalled panel
// into the next test's document.querySelector.
afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  let done = false;
  const unmount = () => {
    if (done) return;
    done = true;
    act(() => root.unmount());
    host.remove();
  };
  mounted.push(unmount);
  return { host, unmount };
}

const panel = () => document.querySelector<HTMLElement>("[data-react-fancy-popover]");

// React synthesises enter/leave from mouseover/mouseout with a relatedTarget
// outside the element; a native "mouseenter" event never reaches it.
function enter(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }));
  });
}
function leave(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Popover.Content keeps the consumer's mouse handlers", () => {
  it("runs onMouseEnter with hover off", () => {
    const spy = vi.fn();
    const { unmount } = mount(
      <Popover open>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content onMouseEnter={spy}>Body</Popover.Content>
      </Popover>,
    );
    enter(panel()!);
    expect(spy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("runs onMouseLeave with hover off", () => {
    const spy = vi.fn();
    const { unmount } = mount(
      <Popover open>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content onMouseLeave={spy}>Body</Popover.Content>
      </Popover>,
    );
    leave(panel()!);
    expect(spy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("runs onMouseEnter with hover on, and still cancels a pending close", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const onOpenChange = vi.fn();
    const { unmount } = mount(
      <Popover hover defaultOpen onOpenChange={onOpenChange}>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content onMouseEnter={spy}>Body</Popover.Content>
      </Popover>,
    );
    const el = panel()!;
    // Leave schedules a close; re-entering before it fires must cancel it.
    leave(el);
    enter(el);
    expect(spy).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(panel()).not.toBeNull();
    unmount();
  });

  it("runs onMouseLeave with hover on, and still closes after the delay", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const onOpenChange = vi.fn();
    const { unmount } = mount(
      <Popover hover defaultOpen onOpenChange={onOpenChange} hoverCloseDelay={300}>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content onMouseLeave={spy}>Body</Popover.Content>
      </Popover>,
    );
    leave(panel()!);
    expect(spy).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(panel()).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(panel()).toBeNull();
    unmount();
  });

  it("hover on: entering the panel opens it after the delay (unchanged)", () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const { unmount } = mount(
      <Popover hover open onOpenChange={onOpenChange} hoverDelay={200}>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content onMouseEnter={() => {}}>Body</Popover.Content>
      </Popover>,
    );
    enter(panel()!);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    unmount();
  });
});
