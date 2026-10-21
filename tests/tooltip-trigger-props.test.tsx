// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Tooltip } from "../src/components/Tooltip";
import { MultiSwitch } from "../src/components/inputs/MultiSwitch";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

function mount(el: ReactElement): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.useRealTimers();
});

const LIST = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

function hover(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

/**
 * Reported: a <MultiSwitch> as the DIRECT child of <Tooltip> rendered with no
 * selected thumb; wrapping it in a <span> fixed it.
 *
 * Tooltip cloned its child with `ref: anchorRef`. In React 19 `ref` is a plain
 * prop on a function component, so it landed in MultiSwitch's `...rest`, and
 * `<div ref={containerRef} {...rest}>` let it REPLACE the ref the thumb is
 * measured from. containerRef stayed null, so the indicator never rendered.
 * The clone also replaced the child's own ref and event handlers outright.
 */
describe("Tooltip trigger keeps its child's own props", () => {
  it("a MultiSwitch directly inside a Tooltip still renders its selected thumb", () => {
    const host = mount(
      <Tooltip content="x">
        <MultiSwitch list={LIST} value="a" className="border-2 border-green-500" />
      </Tooltip>,
    );
    const group = host.querySelector("[data-react-fancy-multi-switch]")!;
    // The thumb is the absolutely positioned span before the option buttons.
    expect(group.querySelector(":scope > span.absolute")).not.toBeNull();
  });

  it("a caller's own ref on a MultiSwitch reaches the group without costing the thumb", () => {
    const ref = createRef<HTMLDivElement>();
    const host = mount(<MultiSwitch ref={ref} list={LIST} value="b" />);
    const group = host.querySelector("[data-react-fancy-multi-switch]")!;
    expect(ref.current).toBe(group);
    expect(group.querySelector(":scope > span.absolute")).not.toBeNull();
  });

  it("keeps the MultiSwitch's className", () => {
    const host = mount(
      <Tooltip content="x">
        <MultiSwitch list={LIST} value="a" className="border-2 border-green-500" />
      </Tooltip>,
    );
    const group = host.querySelector<HTMLElement>("[data-react-fancy-multi-switch]")!;
    expect(group.className).toContain("border-2");
    expect(group.className).toContain("border-green-500");
  });

  it("still anchors and opens on a MultiSwitch trigger", () => {
    vi.useFakeTimers();
    const host = mount(
      <Tooltip content="tip text">
        <MultiSwitch list={LIST} value="a" />
      </Tooltip>,
    );
    hover(host.querySelector("[data-react-fancy-multi-switch]")!);
    expect(document.querySelector("[data-react-fancy-tooltip]")?.textContent).toContain("tip text");
  });

  it("composes the child's own ref instead of replacing it", () => {
    const ref = createRef<HTMLButtonElement>();
    mount(
      <Tooltip content="x">
        <button ref={ref} type="button">
          t
        </button>
      </Tooltip>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("composes the child's own handlers instead of replacing them", () => {
    vi.useFakeTimers();
    const onMouseEnter = vi.fn();
    const onFocus = vi.fn();
    const host = mount(
      <Tooltip content="tip text">
        <button type="button" onMouseEnter={onMouseEnter} onFocus={onFocus}>
          t
        </button>
      </Tooltip>,
    );
    const btn = host.querySelector("button")!;
    hover(btn);
    act(() => btn.focus());
    expect(onMouseEnter).toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalled();
    // ...and the tooltip's own handler still ran.
    expect(document.querySelector("[data-react-fancy-tooltip]")).not.toBeNull();
  });
});
