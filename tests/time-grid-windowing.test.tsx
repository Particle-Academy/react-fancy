// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { TimeGrid } from "../src/components/TimeGrid/TimeGrid";
import type { TimeGridCell, TimeGridSelection } from "../src/components/TimeGrid/TimeGrid.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * TimeGrid column windowing (5.57.0). Render only the columns in view, so a
 * 31-day x fine-slot grid stays fast — without breaking stable handles or
 * selection of cells that are not rendered. Spec: .ai/plans/react-fancy-tribeshare.md §1.
 */

const VIEW = 600; // container width the tests lay out against
let scrollLeft = 0;

beforeEach(() => {
  scrollLeft = 0;
  // jsdom has no layout. Give the scroll container a width and a scroll offset.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute("data-react-fancy-timegrid") ? VIEW : 0;
  });
  Object.defineProperty(HTMLElement.prototype, "scrollLeft", {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute("data-react-fancy-timegrid") ? scrollLeft : 0;
    },
    set(this: HTMLElement, v: number) {
      if (this.hasAttribute("data-react-fancy-timegrid")) scrollLeft = v;
    },
  });
});

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

const STATES = { open: { tone: "emerald" as const, label: "Open" } };
function setup(days: number, nCols: number) {
  const rows = Array.from({ length: days }, (_, i) => `D${i + 1}`);
  const cols = Array.from({ length: nCols }, (_, i) => String(i));
  const cells: TimeGridCell[][] = rows.map((_, r) => cols.map((__, c) => ({ state: "open", meta: { r, c } })));
  return { rows, cols, cells };
}
const outer = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-timegrid]")!;
const gridEl = (host: HTMLElement) => host.querySelector<HTMLElement>('[role="grid"]')!;
const rendered = (host: HTMLElement, r: number) =>
  [...host.querySelectorAll<HTMLElement>("[data-react-fancy-timegrid-cell]")]
    .map((el) => el.getAttribute("data-react-fancy-timegrid-cell")!)
    .filter((id) => id.startsWith(`${r}:`))
    .map((id) => Number(id.split(":")[1]));
const scrollTo = (host: HTMLElement, x: number) =>
  act(() => {
    scrollLeft = x;
    outer(host).dispatchEvent(new Event("scroll"));
  });
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
  });

describe("TimeGrid windowing — renders the columns in view", () => {
  it("a 31-day x 240-slot grid renders a window, not 7,440 cells", () => {
    const { rows, cols, cells } = setup(31, 240);
    const { host } = mount(
      <TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns />,
    );
    const total = host.querySelectorAll("[data-react-fancy-timegrid-cell]").length;
    // 600px / 8px pitch = 75 visible columns, plus overscan.
    const perRow = rendered(host, 0);
    expect(perRow[0]).toBe(0);
    expect(perRow.length).toBeGreaterThanOrEqual(75);
    expect(perRow.length).toBeLessThan(240);
    expect(total).toBe(perRow.length * 31);
    // Every row renders the same window, so the grid tracks stay aligned.
    expect(rendered(host, 30)).toEqual(perRow);
  });

  it("the tracks never change while scrolling: the full width, every column placed where it belongs", () => {
    // Rewriting grid-template-columns on every window shift re-laid out the
    // whole grid each frame (median 42 ms/frame at 4x CPU for 14d in Chrome).
    // The template is the full grid, fixed; a row's first rendered cell is
    // placed explicitly and the rest follow it.
    const { rows, cols, cells } = setup(3, 240);
    const { host } = mount(<TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns />);
    const before = gridEl(host).style.gridTemplateColumns;
    scrollTo(host, 800);
    expect(gridEl(host).style.gridTemplateColumns).toBe(before);
    expect(before).toBe("max-content repeat(240, 8px)");
    const seen = rendered(host, 2);
    const first = host.querySelector<HTMLElement>(`[data-react-fancy-timegrid-cell="2:${seen[0]}"]`)!;
    expect(first.style.gridColumnStart).toBe(String(seen[0] + 2));
    const header = host.querySelectorAll<HTMLElement>('[role="rowheader"]')[2];
    expect(header.style.gridColumnStart).toBe("1");
  });

  it("scrolling moves the window with no blank gap at the viewport", () => {
    const { rows, cols, cells } = setup(3, 240);
    const { host } = mount(<TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns />);
    scrollTo(host, 800); // columns 100..175 are on screen
    const seen = rendered(host, 1);
    expect(seen[0]).toBeLessThanOrEqual(100);
    expect(seen[seen.length - 1]).toBeGreaterThanOrEqual(175);
    expect(seen).not.toContain(0);
  });

  it("renders cells ONCE on mount: no first pass at a guessed width", () => {
    // Measured in Chrome at 4x CPU, 31d x 240 in 800px: the window mounted in
    // 681 ms against 562 ms unwindowed, because the first render guessed the
    // width from window.innerWidth, paid full style+layout for it, then
    // re-rendered at the measured width. The first pass must hold no cells.
    const { rows, cols, cells } = setup(3, 240);
    let renders = 0;
    const counted = cells.map((row) =>
      row.map((cell) => {
        const o = { ...cell };
        Object.defineProperty(o, "state", {
          get() {
            renders++;
            return "open";
          },
        });
        return o;
      }),
    );
    // Wider than the container, so a guessed first pass would render more.
    const inner = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 4000 });
    try {
      mount(<TimeGrid rows={rows} cols={cols} cells={counted} states={STATES} cellWidth={6} windowColumns />);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: inner });
    }
    const shown = rendered(document.body, 0).length;
    // Each rendered cell reads `state` once per render pass.
    expect(renders).toBe(shown * 3);
  });

  it("a window shift renders only the columns entering view, not every cell again", () => {
    // Measured in Chrome at 4x CPU, 31d in 800px: rebuilding every rendered
    // cell on each shift gave p95 157 ms/frame while scrolling.
    const { rows, cols, cells } = setup(3, 240);
    let reads = 0;
    const counted = cells.map((row) =>
      row.map((cell) => {
        const o = { ...cell };
        Object.defineProperty(o, "state", {
          get() {
            reads++;
            return "open";
          },
        });
        return o;
      }),
    );
    const { host } = mount(<TimeGrid rows={rows} cols={cols} cells={counted} states={STATES} cellWidth={6} windowColumns />);
    const before = rendered(host, 0);
    reads = 0;
    scrollTo(host, 256); // 32 columns
    const after = rendered(host, 0);
    const entering = after.filter((c) => !before.includes(c)).length;
    expect(entering).toBeGreaterThan(0);
    expect(reads).toBe(entering * 3);
  });

  it("server render (no layout) emits the frame and no cells", async () => {
    const { renderToString } = await import("react-dom/server");
    const { rows, cols, cells } = setup(3, 240);
    const html = renderToString(
      <TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns />,
    );
    expect(html).toContain('role="grid"');
    expect(html).not.toContain("data-react-fancy-timegrid-cell");
  });

  it("a jump (scrollbar click, a scrolled-to cell) is rendered before the next paint", () => {
    // Measured in Chrome at 4x CPU: every jump left one frame with the whole
    // viewport blank, because the scroll update rendered after the paint. The
    // window must be in the DOM when the scroll event returns, no act() needed.
    const { rows, cols, cells } = setup(2, 240);
    const { host } = mount(<TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns />);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    try {
      scrollLeft = 1400;
      outer(host).dispatchEvent(new Event("scroll"));
      expect(rendered(host, 0)).toContain(200);
    } finally {
      (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
      errors.mockRestore();
    }
  });

  it("is on by default above 500 columns, off at 240 unless asked", () => {
    const wide = setup(2, 600);
    const { host } = mount(<TimeGrid rows={wide.rows} cols={wide.cols} cells={wide.cells} states={STATES} cellWidth={6} />);
    expect(rendered(host, 0).length).toBeLessThan(600);

    const day = setup(2, 240);
    const b = mount(<TimeGrid rows={day.rows} cols={day.cols} cells={day.cells} states={STATES} cellWidth={6} />);
    expect(rendered(b.host, 0)).toHaveLength(240);

    const off = mount(
      <TimeGrid rows={wide.rows} cols={wide.cols} cells={wide.cells} states={STATES} cellWidth={6} windowColumns={false} />,
    );
    expect(rendered(off.host, 0)).toHaveLength(600);
  });

  it("windowed cells carry aria-colindex so position survives the gaps", () => {
    const { rows, cols, cells } = setup(2, 240);
    const { host } = mount(<TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns />);
    scrollTo(host, 800);
    const c = rendered(host, 0)[0];
    const el = host.querySelector(`[data-react-fancy-timegrid-cell="0:${c}"]`)!;
    expect(el.getAttribute("aria-colindex")).toBe(String(c + 2));
    expect(gridEl(host).getAttribute("aria-colcount")).toBe("241");
  });
});

describe("TimeGrid windowing — stable handles and selection reach unrendered cells", () => {
  it("keyboard focus moved past the window scrolls it into view and renders it", () => {
    const { rows, cols, cells } = setup(2, 240);
    const { host } = mount(<TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns />);
    const g = gridEl(host);
    act(() => g.focus());
    for (let i = 0; i < 150; i++) key(g, "ArrowRight");
    act(() => outer(host).dispatchEvent(new Event("scroll")));
    expect(scrollLeft).toBeGreaterThan(0);
    const active = document.getElementById(g.getAttribute("aria-activedescendant")!);
    expect(active?.getAttribute("data-react-fancy-timegrid-cell")).toBe("0:150");
  });

  it("a selection across unrendered columns reports every cell, from data not DOM", () => {
    const onSel = vi.fn();
    const { rows, cols, cells } = setup(2, 240);
    const { host } = mount(
      <TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns selectionShape="linear" onSelectionChange={onSel} />,
    );
    const g = gridEl(host);
    act(() => g.focus());
    key(g, " ");
    key(g, "ArrowDown", { shiftKey: true });
    const [sel, got] = onSel.mock.calls.at(-1) as [TimeGridSelection, TimeGridCell[]];
    expect(sel).toEqual({ shape: "linear", from: { r: 0, c: 0 }, to: { r: 1, c: 0 } });
    expect(got).toHaveLength(241);
    expect(got[200]).toBe(cells[0][200]);
  });

  it("a selection set from outside (an agent) that is out of view scrolls into view", () => {
    const { rows, cols, cells } = setup(2, 240);
    const { host, rerender } = mount(
      <TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} windowColumns selection={null} />,
    );
    rerender(
      <TimeGrid
        rows={rows}
        cols={cols}
        cells={cells}
        states={STATES}
        cellWidth={6}
        windowColumns
        selection={{ shape: "rectangle", r1: 0, c1: 200, r2: 1, c2: 210 }}
      />,
    );
    act(() => outer(host).dispatchEvent(new Event("scroll")));
    expect(scrollLeft).toBeGreaterThan(0);
    expect(host.querySelector('[data-react-fancy-timegrid-cell="1:205"]')?.getAttribute("aria-selected")).toBe("true");
  });
});
