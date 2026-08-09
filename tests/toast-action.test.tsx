// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { ToastItem } from "../src/components/Toast/ToastItem";
import type { ToastData } from "../src/components/Toast/Toast.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function item(data: Partial<ToastData>, onDismiss = () => {}) {
  return mount(
    <ToastItem
      data={{ id: "t1", title: "Moved to Claimed", ...data } as ToastData}
      onDismiss={onDismiss}
    />,
  );
}

/**
 * A Toast needs a real action — issue #18.
 *
 * `ToastData` was `{ title, description, variant, duration }`, so undo could
 * only ever be a timeout. The report is right that this is a correctness
 * problem rather than a styling one:
 *
 *   > a timeout-based undo makes the safety of an action depend on how fast
 *   > someone reads, which is worst for exactly the people who need undo most
 *
 * Without a slot a consumer either drops undo or reimplements the toast — and
 * the reimplementation does not join the provider's stack, so it overlaps the
 * real ones.
 */
describe("Toast action", () => {
  it("renders the action as a real button", () => {
    // A real <button> is what makes it reachable by Tab from wherever focus
    // already is; a div with onClick would look identical and not be.
    const { host, unmount } = item({ action: { label: "Undo", onClick: () => {} } });

    const btn = [...host.querySelectorAll("button")].find((b) => b.textContent === "Undo");

    expect(btn).toBeDefined();
    expect(btn!.tagName).toBe("BUTTON");

    unmount();
  });

  it("calls the action, then dismisses", () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    const { host, unmount } = item({ action: { label: "Undo", onClick } }, onDismiss);

    const btn = [...host.querySelectorAll("button")].find((b) => b.textContent === "Undo")!;
    act(() => btn.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(onClick).toHaveBeenCalledTimes(1);
    // The offer is consumed — leaving it up invites a second undo of an
    // already-undone action.
    expect(onDismiss).toHaveBeenCalledWith("t1");

    unmount();
  });

  it("does NOT auto-dismiss when it carries an action", () => {
    // Expiring the offer is the same bug as making undo a timeout.
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { unmount } = item({ action: { label: "Undo", onClick: () => {} } }, onDismiss);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onDismiss).not.toHaveBeenCalled();

    unmount();
    vi.useRealTimers();
  });

  it("still honours an explicit duration on an action toast", () => {
    // Opting back in must remain possible — the default is a default, not a ban.
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { unmount } = item(
      { action: { label: "Undo", onClick: () => {} }, duration: 3000 },
      onDismiss,
    );

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(onDismiss).toHaveBeenCalledWith("t1");

    unmount();
    vi.useRealTimers();
  });

  it("still auto-dismisses a plain toast", () => {
    // Regression guard: the default for toasts WITHOUT an action must not move.
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { unmount } = item({}, onDismiss);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(onDismiss).toHaveBeenCalledWith("t1");

    unmount();
    vi.useRealTimers();
  });

  it("dismisses on Escape from inside the toast", () => {
    const onDismiss = vi.fn();
    const { host, unmount } = item({ action: { label: "Undo", onClick: () => {} } }, onDismiss);

    const btn = [...host.querySelectorAll("button")].find((b) => b.textContent === "Undo")!;
    act(() => {
      btn.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onDismiss).toHaveBeenCalledWith("t1");

    unmount();
  });
});
