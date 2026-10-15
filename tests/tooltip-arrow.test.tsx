// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { Tooltip } from "../src/components/Tooltip";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.useRealTimers());

/**
 * The arrow takes the bubble's background rather than carrying its own.
 *
 * It was hard-coded `bg-zinc-900`, so restyling the bubble through `className` —
 * which Composer's paste-pill popover does — left a dark arrow pointing out of a
 * light bubble.
 */
it("the arrow inherits the bubble's background, so a restyled tooltip stays one colour", () => {
  vi.useFakeTimers();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  act(() =>
    root.render(
      <Tooltip content="hi" className="bg-rose-50">
        <button type="button">trigger</button>
      </Tooltip>,
    ),
  );
  act(() => {
    host.querySelector("button")!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(500);
  });

  const bubble = document.querySelector("[data-react-fancy-tooltip]")!;
  const arrow = bubble.querySelector("div")!;

  expect(arrow.className).toContain("bg-inherit");
  expect(arrow.className).not.toMatch(/bg-zinc/);

  act(() => root.unmount());
  host.remove();
});
