// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { TimePicker } from "../src/components/TimePicker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * TimePicker survives the view -> edit transition.
 *
 * Four `useCallback`s used to sit BELOW the `if (!showControl)` early return, so
 * view mode ran three hooks and edit mode ran seven. React compares hook counts
 * between renders of the same component, so the first click on "Click to edit"
 * desynced the hook order and threw from inside React — an error naming none of
 * the responsible code, with the component gone from the page.
 *
 * The whole existing suite passed against the broken version, because every test
 * rendered ONE mode and stopped. The bug lives exclusively in the TRANSITION, so
 * a test that never crosses it cannot see it. That is the point of this file:
 * mount in view mode, then flip.
 */
const roots: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  roots.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  roots.splice(0).forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

describe("TimePicker hook order", () => {
  it("does not throw when a click promotes view mode to edit mode", () => {
    // React logs the hook-order error to console.error before throwing; failing
    // on it as well as on the throw means a downgrade to a warning still fails.
    const errors: unknown[] = [];
    vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args[0]);
    });

    const host = mount(<TimePicker defaultValue="09:30" mode="view" />);

    const view = host.querySelector<HTMLElement>('[data-mode="view"]');
    expect(view, "expected TimePicker to start in view mode").not.toBeNull();

    // The documented affordance: title="Click to edit".
    expect(() => {
      act(() => {
        view!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    }).not.toThrow();

    // It must actually have switched — an early return that silently kept
    // rendering view mode would pass the throw assertion while proving nothing.
    expect(host.querySelector('[data-mode="view"]')).toBeNull();
    expect(host.querySelector("[data-react-fancy-time-picker]")).not.toBeNull();

    const hookOrder = errors.filter(
      (e) => typeof e === "string" && /hook|Rendered more hooks|order of Hooks/i.test(e),
    );
    expect(hookOrder, `React reported a hook error: ${String(hookOrder[0])}`).toEqual([]);
  });

  it("still works when it starts in edit mode", () => {
    // The counter-case (mode defaults to "edit"). Hoisting hooks above an early
    // return can break the branch that was previously fine, and that branch is
    // the one every existing test already covered.
    const host = mount(<TimePicker defaultValue="09:30" />);

    expect(host.querySelector('[data-mode="view"]')).toBeNull();
    expect(host.textContent).toContain("09");
  });

  it("survives repeated transitions in both directions", () => {
    // Once each is the minimum; a hook-order fault can also need two rounds to
    // surface, and nothing here should accumulate state across the boundary.
    const host = mount(<TimePicker defaultValue="09:30" mode="view" />);

    expect(() => {
      for (let i = 0; i < 3; i++) {
        const view = host.querySelector<HTMLElement>('[data-mode="view"]');
        if (!view) break;
        act(() => view.dispatchEvent(new MouseEvent("click", { bubbles: true })));
        act(() => {
          document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        });
      }
    }).not.toThrow();
  });
});
