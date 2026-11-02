// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The thumb is measured from the selected option's box. It was measured only
 * when the SELECTION changed, so a selected label that changed width
 * ("Changed 4" -> "Changed 12") left the thumb at its old width. A consumer
 * shows live counts in its labels, so this was visible on every update.
 */

type Observer = { cb: ResizeObserverCallback; targets: Element[]; disconnected: boolean };
let observers: Observer[] = [];

class FakeResizeObserver {
  private o: Observer;
  constructor(cb: ResizeObserverCallback) {
    this.o = { cb, targets: [], disconnected: false };
    observers.push(this.o);
  }
  observe(el: Element) {
    this.o.targets.push(el);
  }
  unobserve() {}
  disconnect() {
    this.o.disconnected = true;
  }
}

/** Width per option label; the container sits at left 0. */
const widths = new Map<string, number>();

function rectFor(el: Element): DOMRect {
  const isOption = el.getAttribute("role") === "radio";
  if (!isOption) return { left: 0, top: 0, width: 300, height: 30, right: 300, bottom: 30, x: 0, y: 0, toJSON() {} } as DOMRect;
  // Lay options out left to right by their current widths.
  const siblings = Array.from(el.parentElement!.querySelectorAll('[role="radio"]'));
  let left = 0;
  for (const s of siblings) {
    const w = widths.get(s.textContent ?? "") ?? 50;
    if (s === el) return { left, top: 0, width: w, height: 30, right: left + w, bottom: 30, x: left, y: 0, toJSON() {} } as DOMRect;
    left += w;
  }
  throw new Error("unreachable");
}

const mounted: Array<() => void> = [];
const originalRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;

beforeEach(() => {
  observers = [];
  widths.clear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return rectFor(this);
  });
});

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.restoreAllMocks();
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = originalRO;
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
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)), unmount: () => mounted.pop()!() };
}

const thumb = (host: HTMLElement) =>
  host.querySelector("[data-react-fancy-multi-switch-thumb]") as HTMLElement | null;

const live = () => observers.filter((o) => !o.disconnected);

describe("MultiSwitch thumb re-measures on resize", () => {
  it("updates the thumb width when the selected option resizes, with no selection change", () => {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
    widths.set("All", 40);
    widths.set("Changed 4", 80);

    const list = (n: number) => [
      { value: "all", label: "All" },
      { value: "changed", label: `Changed ${n}` },
    ];
    const noop = () => {};

    const { host, rerender } = mount(<MultiSwitch list={list(4)} value="changed" onValueChange={noop} />);
    expect(thumb(host)!.style.width).toBe("80px");
    expect(thumb(host)!.style.left).toBe("40px");

    // The label grows. Nothing about the selection changes.
    widths.set("Changed 12", 96);
    rerender(<MultiSwitch list={list(12)} value="changed" onValueChange={noop} />);

    // The observer is what reports the new box.
    const selected = host.querySelector('[role="radio"][aria-checked="true"]')!;
    const watching = live().filter((o) => o.targets.includes(selected));
    expect(watching.length).toBeGreaterThan(0);
    act(() => {
      for (const o of watching) o.cb([], o as unknown as ResizeObserver);
    });

    expect(thumb(host)!.style.width).toBe("96px");
  });

  it("observes the container too, and swaps observers when the selection changes", () => {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
    const list = [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ];
    const { host, rerender } = mount(<MultiSwitch list={list} value="a" onValueChange={() => {}} />);
    const container = host.querySelector("[data-react-fancy-multi-switch]")!;
    const [optA, optB] = Array.from(host.querySelectorAll('[role="radio"]'));

    expect(live().some((o) => o.targets.includes(container))).toBe(true);
    expect(live().some((o) => o.targets.includes(optA))).toBe(true);

    rerender(<MultiSwitch list={list} value="b" onValueChange={() => {}} />);
    expect(live().some((o) => o.targets.includes(optA))).toBe(false);
    expect(live().some((o) => o.targets.includes(optB))).toBe(true);
  });

  it("disconnects on unmount", () => {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = FakeResizeObserver;
    const { unmount } = mount(<MultiSwitch list={["a", "b"]} value="a" onValueChange={() => {}} />);
    expect(live().length).toBeGreaterThan(0);
    unmount();
    expect(live()).toHaveLength(0);
  });

  it("does not throw without ResizeObserver, and still measures on selection", () => {
    delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
    widths.set("a", 30);
    widths.set("b", 70);

    const { host, rerender } = mount(<MultiSwitch list={["a", "b"]} value="a" onValueChange={() => {}} />);
    expect(thumb(host)!.style.width).toBe("30px");
    rerender(<MultiSwitch list={["a", "b"]} value="b" onValueChange={() => {}} />);
    expect(thumb(host)!.style.width).toBe("70px");
    expect(thumb(host)!.style.left).toBe("30px");
  });
});
