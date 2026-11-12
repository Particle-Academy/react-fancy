// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, Profiler, StrictMode, type ProfilerOnRenderCallback, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Tabs } from "../src/components/Tabs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * React error #185 ("Maximum update depth exceeded") from `Tabs.List`.
 *
 * The list re-derived its fallback tab stop in a layout effect keyed on
 * `children`, so a parent that re-renders with a fresh children array (any
 * `.map()`) ran it on every render. With no tab aria-selected it called
 * `setFallback` each time, and although the updater returned the previous
 * value, React cannot always bail out of an updater early: on every second
 * render it scheduled a synchronous nested re-render of the list from the
 * layout effect, the `dispatchSetState` frame in the reported stack. One
 * wasted commit in isolation; in a host that also updates in its layout
 * effects, a chain toward React's nested-update limit, which unmounts the app.
 *
 * The list now compares against the last value it set before setting, and no
 * longer keys anything on `children` identity, so a parent re-render costs
 * exactly one commit and nothing is ever dispatched when nothing changed.
 */

const mounted: Array<() => void> = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.restoreAllMocks();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

const VALUES = Array.from({ length: 40 }, (_, i) => `tab-${i}`);
const stops = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter((t) => t.tabIndex === 0);

function Fixture({
  tick,
  onRender,
  values = VALUES,
  firstDisabled = false,
}: {
  tick: number;
  onRender: ProfilerOnRenderCallback;
  values?: string[];
  firstDisabled?: boolean;
}) {
  return (
    <Tabs activeTab="matches-no-tab" onTabChange={() => {}}>
      <Profiler id="tabs-list" onRender={onRender}>
        <Tabs.List>
          {values.map((v, i) => (
            <Tabs.Tab key={v} value={v} disabled={i === 0 && firstDisabled}>
              {v} ({tick})
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Profiler>
    </Tabs>
  );
}

function soak(wrap: (el: ReactElement) => ReactElement) {
  const errors: string[] = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
  const phases: string[] = [];
  const onRender: ProfilerOnRenderCallback = (_id, phase) => phases.push(phase);

  const { host, rerender } = mount(wrap(<Fixture tick={0} onRender={onRender} />));
  phases.length = 0;

  const RENDERS = 30;
  for (let tick = 1; tick <= RENDERS; tick++) {
    expect(() => rerender(wrap(<Fixture tick={tick} onRender={onRender} />))).not.toThrow();
  }
  return { host, errors, phases, RENDERS };
}

describe("Tabs.List with no selected tab, re-rendered with new children arrays", () => {
  it("never dispatches a nested update and commits once per parent render", () => {
    const { host, errors, phases, RENDERS } = soak((el) => el);

    expect(errors.filter((e) => /Maximum update depth|#185/.test(e))).toEqual([]);
    // The bound: one commit per parent render, none of them a nested update
    // dispatched from the list's own layout effect.
    expect(phases.filter((p) => p === "nested-update")).toEqual([]);
    expect(phases).toHaveLength(RENDERS);
    expect(stops(host).map((t) => t.textContent)).toEqual(["tab-0 (30)"]);
  });

  it("holds under StrictMode", () => {
    const { host, errors, phases } = soak((el) => <StrictMode>{el}</StrictMode>);

    expect(errors.filter((e) => /Maximum update depth|#185/.test(e))).toEqual([]);
    expect(phases.filter((p) => p === "nested-update")).toEqual([]);
    expect(stops(host)).toHaveLength(1);
  });
});

describe("Tabs.List fallback still follows the tabs without a children dependency", () => {
  const noop: ProfilerOnRenderCallback = () => {};

  it("moves the stop when keyed tabs are reordered", () => {
    const { host, rerender } = mount(<Fixture tick={0} onRender={noop} values={["a", "b", "c"]} />);
    expect(stops(host).map((t) => t.textContent)).toEqual(["a (0)"]);

    rerender(<Fixture tick={1} onRender={noop} values={["c", "a", "b"]} />);
    expect(stops(host).map((t) => t.textContent)).toEqual(["c (1)"]);
  });

  it("moves the stop when the first tab is removed, added back or disabled", () => {
    const { host, rerender } = mount(<Fixture tick={0} onRender={noop} values={["a", "b", "c"]} />);

    rerender(<Fixture tick={1} onRender={noop} values={["b", "c"]} />);
    expect(stops(host).map((t) => t.textContent)).toEqual(["b (1)"]);

    rerender(<Fixture tick={2} onRender={noop} values={["a", "b", "c"]} />);
    expect(stops(host).map((t) => t.textContent)).toEqual(["a (2)"]);

    rerender(<Fixture tick={3} onRender={noop} values={["a", "b", "c"]} firstDisabled />);
    expect(stops(host).map((t) => t.textContent)).toEqual(["b (3)"]);
  });
});
