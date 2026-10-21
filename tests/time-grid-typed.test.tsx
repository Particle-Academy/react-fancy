// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { TimeGrid } from "../src/components/TimeGrid/TimeGrid";
import type {
  TimeGridCell,
  TimeGridSelection,
  TimeGridStateDef,
  TimeGridMarkDef,
} from "../src/components/TimeGrid/TimeGrid.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * TimeGrid typed cells + range selection (5.55.0).
 *
 * The kit declares the SHAPE of a cell; the host declares the VOCABULARY
 * (`states`, `marks`). Selection is a discriminated union because a rectangle
 * (09:00-17:00 across Mon-Fri) and a linear run (23:54 Mon through 00:06 Tue)
 * are different values. Spec: .ai/plans/react-fancy-tribeshare.md section 1.
 */

const mounted: Array<() => void> = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  const unmount = () => {
    act(() => root.unmount());
    host.remove();
  };
  mounted.push(unmount);
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

const STATES: Record<string, TimeGridStateDef> = {
  open: { tone: "emerald", label: "Open" },
  closed: { label: "Closed" },
  booked: { tone: "rose", label: "Booked" },
};
const MARKS: Record<string, TimeGridMarkDef> = {
  price: { tone: "amber", label: "Price adjusted" },
};

const ROWS = ["Mon", "Tue", "Wed"];
const COLS = ["0", "1", "2", "3", "4", "5"];

function grid(fill: (r: number, c: number) => Partial<TimeGridCell> = () => ({})): TimeGridCell[][] {
  return ROWS.map((_, r) =>
    COLS.map((__, c) => ({ state: "open", meta: { r, c }, ...fill(r, c) })),
  );
}

function cellEl(host: HTMLElement, r: number, c: number): HTMLElement {
  const el = host.querySelector<HTMLElement>(`[data-react-fancy-timegrid-cell="${r}:${c}"]`);
  if (!el) throw new Error(`no cell ${r}:${c}`);
  return el;
}

function gridEl(host: HTMLElement): HTMLElement {
  return host.querySelector<HTMLElement>('[role="grid"]')!;
}

function pointer(el: Element, type: string, init: PointerEventInit = {}) {
  act(() => {
    el.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, ...init }),
    );
  });
}

function key(el: Element, k: string, init: KeyboardEventInit = {}) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
  });
}

function drag(host: HTMLElement, from: [number, number], to: [number, number]) {
  pointer(cellEl(host, ...from), "pointerdown");
  // A fast drag: the pointer jumps straight to the far corner, visiting
  // nothing in between. The old grid painted VISITED cells and left gaps.
  pointer(cellEl(host, ...to), "pointermove");
  pointer(cellEl(host, ...to), "pointerup");
}

type Spy = ReturnType<typeof vi.fn>;
function lastCall(spy: Spy): [TimeGridSelection | null, TimeGridCell[]] {
  return spy.mock.calls.at(-1) as [TimeGridSelection | null, TimeGridCell[]];
}
const metas = (cells: TimeGridCell[]) => cells.map((c) => c.meta);

describe("TimeGrid — boolean grids keep working", () => {
  it("still renders boolean[][] and toggles through onChange", () => {
    const onChange = vi.fn();
    const value = ROWS.map(() => COLS.map(() => false));
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} value={value} onChange={onChange} />);

    const b = host.querySelector('button[data-react-fancy-timegrid-cell="1:2"]')!;
    act(() => {
      b.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][1][2]).toBe(true);
    // No typed-grid markup leaks into a boolean grid.
    expect(host.querySelector('[role="grid"]')).toBeNull();
  });
});

describe("TimeGrid — typed cells render the host's vocabulary", () => {
  it("paints each cell with its own state's tone and names the state", () => {
    const cells = grid((r, c) => (c === 0 ? { state: "booked" } : c === 1 ? { state: "closed" } : {}));
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} />);

    const open = cellEl(host, 0, 3);
    const booked = cellEl(host, 0, 0);
    expect(open.getAttribute("data-state")).toBe("open");
    expect(open.className).toMatch(/\bbg-emerald-500\b/);
    expect(booked.className).toMatch(/\bbg-rose-500\b/);
    // A state with no tone renders the neutral surface token, not the toneOn violet.
    const closed = cellEl(host, 0, 1);
    expect(closed.className).toContain("--fancy-surface-muted");
    expect(closed.className).not.toMatch(/violet/);

    expect(open.getAttribute("aria-label")).toBe("Mon 3 Open");
    expect(booked.getAttribute("aria-label")).toBe("Mon 0 Booked");
  });

  it("applies a state's own className — the host's styling, not ours", () => {
    const states = { ...STATES, buffer: { label: "Buffer", className: "probe-buffer-class" } };
    const { host } = mount(
      <TimeGrid rows={ROWS} cols={COLS} cells={grid((r, c) => (c === 2 ? { state: "buffer" } : {}))} states={states} />,
    );
    expect(cellEl(host, 1, 2).className).toContain("probe-buffer-class");
  });

  it("draws marks on top of the state and announces their labels", () => {
    const cells = grid((r, c) => (r === 0 && c === 4 ? { marks: ["price"] } : {}));
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} marks={MARKS} />);

    const cell = cellEl(host, 0, 4);
    expect(cell.getAttribute("data-marks")).toBe("price");
    expect(cell.querySelector("[data-react-fancy-timegrid-mark]")?.className).toMatch(/\bbg-amber-500\b/);
    expect(cell.getAttribute("aria-label")).toBe("Mon 4 Open, Price adjusted");
  });

  it("draws a mark's icon when the host supplies one", () => {
    const marks = { ...MARKS, lock: { icon: <svg data-probe-icon="" />, label: "Locked" } };
    const cells = grid((r, c) => (r === 1 && c === 1 ? { marks: ["lock"] } : {}));
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} marks={marks} />);
    const mark = cellEl(host, 1, 1).querySelector('[data-react-fancy-timegrid-mark="lock"]');
    expect(mark?.querySelector("[data-probe-icon]")).not.toBeNull();
  });

  it("does not import Icon — that would pull every Lucide glyph into a TimeGrid bundle", () => {
    // Measured 2026-10-21: importing <Icon> here took an esbuild bundle of
    // TimeGrid alone from 16k to 56k lines (1,600 Lucide modules) and made the
    // boolean grid's update ~50% slower at 4x CPU, with byte-identical DOM.
    const src = readFileSync(resolve(process.cwd(), "src/components/TimeGrid/TypedTimeGrid.tsx"), "utf8");
    expect(src).not.toMatch(/from "\.\.\/Icon/);
  });

  it("refuses cells with no states, loudly, in development", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      mount(<TimeGrid rows={ROWS} cols={COLS} cells={grid()} />),
    ).toThrow(/states/);
    err.mockRestore();
  });

  it("an unknown state id warns once per id and renders neutral", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cells = grid((r, c) => (c < 3 ? { state: "mystery-state-x" } : {}));
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} />);

    const hits = warn.mock.calls.filter((a) => String(a[0]).includes("mystery-state-x"));
    expect(hits).toHaveLength(1);
    expect(cellEl(host, 0, 0).className).toContain("--fancy-surface-muted");
    warn.mockRestore();
  });
});

describe("TimeGrid — disabled cells explain themselves", () => {
  it("carries reasons in title AND aria-description, and is aria-disabled", () => {
    const cells = grid((r, c) =>
      r === 1 && c === 2 ? { state: "booked", disabled: true, reasons: ["Booked by Ana", "Buffer after"] } : {},
    );
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} />);
    const cell = cellEl(host, 1, 2);
    expect(cell.getAttribute("aria-disabled")).toBe("true");
    expect(cell.getAttribute("aria-description")).toBe("Booked by Ana. Buffer after");
    expect(cell.getAttribute("title")).toBe("Booked by Ana. Buffer after");
  });

  it("a click on a disabled cell reports it and selects nothing", () => {
    const onSel = vi.fn();
    const onBlocked = vi.fn();
    const cells = grid((r, c) => (r === 0 && c === 0 ? { disabled: true, reasons: ["Closed"] } : {}));
    const { host } = mount(
      <TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} onSelectionChange={onSel} onBlockedSelect={onBlocked} />,
    );
    pointer(cellEl(host, 0, 0), "pointerdown");
    expect(onSel).not.toHaveBeenCalled();
    expect(onBlocked).toHaveBeenCalledWith([{ r: 0, c: 0, reasons: ["Closed"] }]);
  });

  it("shows the focused cell's reasons in a tooltip, not only on hover", () => {
    const cells = grid((r, c) => (r === 0 && c === 0 ? { disabled: true, reasons: ["Closed for cleaning"] } : {}));
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} />);
    const g = gridEl(host);
    act(() => g.focus());
    const tip = host.querySelector('[data-react-fancy-timegrid-tooltip]');
    expect(tip?.textContent).toContain("Closed for cleaning");
    expect(tip?.getAttribute("role")).toBe("tooltip");
  });
});

describe("TimeGrid — rectangle selection (the default shape)", () => {
  it("is derived from anchor + current cell, so a fast drag leaves no gaps", () => {
    const onSel = vi.fn();
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} onSelectionChange={onSel} />);
    drag(host, [0, 1], [2, 4]);

    const [sel, cells] = lastCall(onSel);
    expect(sel).toEqual({ shape: "rectangle", r1: 0, c1: 1, r2: 2, c2: 4 });
    expect(cells).toHaveLength(12);
    // Cells arrive in selection order, carrying the host's meta untouched.
    expect(metas(cells).slice(0, 5)).toEqual([
      { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 1, c: 1 },
    ]);
  });

  it("a drag that leaves the grid clamps to the edge it left by", () => {
    // Pointer capture keeps the moves coming once the pointer is outside the
    // grid, but nothing there is a cell. Measured in Chrome before this test:
    // the run stopped at the last cell the pointer crossed (col 44 of 48).
    const onSel = vi.fn();
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} onSelectionChange={onSel} />);
    // Lay the cells out: 10px pitch from (100, 50).
    for (let r = 0; r < ROWS.length; r++) {
      for (let c = 0; c < COLS.length; c++) {
        const left = 100 + c * 10;
        const top = 50 + r * 10;
        cellEl(host, r, c).getBoundingClientRect = () =>
          ({ left, top, right: left + 10, bottom: top + 10, x: left, y: top, width: 10, height: 10 }) as DOMRect;
      }
    }
    pointer(cellEl(host, 0, 1), "pointerdown");
    // Far right of the grid, level with row 1: target is the grid, not a cell.
    pointer(gridEl(host), "pointermove", { clientX: 900, clientY: 65 });
    expect(lastCall(onSel)[0]).toEqual({ shape: "rectangle", r1: 0, c1: 1, r2: 1, c2: 5 });
    // And below-left of it.
    pointer(gridEl(host), "pointermove", { clientX: 0, clientY: 999 });
    expect(lastCall(onSel)[0]).toEqual({ shape: "rectangle", r1: 0, c1: 0, r2: 2, c2: 1 });
  });

  it("passes the host's meta objects back by identity", () => {
    const onSel = vi.fn();
    const cells = grid();
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} onSelectionChange={onSel} />);
    pointer(cellEl(host, 2, 5), "pointerdown");
    expect(lastCall(onSel)[1][0]).toBe(cells[2][5]);
  });

  it("normalises a drag up-and-left so r1<=r2 and c1<=c2", () => {
    const onSel = vi.fn();
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} onSelectionChange={onSel} />);
    drag(host, [2, 4], [0, 1]);
    expect(lastCall(onSel)[0]).toEqual({ shape: "rectangle", r1: 0, c1: 1, r2: 2, c2: 4 });
  });

  it("marks selected cells aria-selected", () => {
    const { host } = mount(
      <TimeGrid
        rows={ROWS}
        cols={COLS}
        cells={grid()}
        states={STATES}
        selection={{ shape: "rectangle", r1: 0, c1: 0, r2: 1, c2: 1 }}
      />,
    );
    expect(cellEl(host, 1, 1).getAttribute("aria-selected")).toBe("true");
    expect(cellEl(host, 1, 2).getAttribute("aria-selected")).toBe("false");
    expect(gridEl(host).getAttribute("aria-multiselectable")).toBe("true");
  });

  it("fires onSelectionCommit when the drag ends", () => {
    const onCommit = vi.fn();
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} onSelectionCommit={onCommit} />);
    drag(host, [0, 0], [1, 1]);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][0]).toEqual({ shape: "rectangle", r1: 0, c1: 0, r2: 1, c2: 1 });
    expect(onCommit.mock.calls[0][1]).toHaveLength(4);
  });
});

describe("TimeGrid — linear selection (one run in time order)", () => {
  it("wraps a row end and keeps going — an overnight run", () => {
    const onSel = vi.fn();
    const { host } = mount(
      <TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} selectionShape="linear" onSelectionChange={onSel} />,
    );
    drag(host, [0, 4], [1, 1]);
    const [sel, cells] = lastCall(onSel);
    expect(sel).toEqual({ shape: "linear", from: { r: 0, c: 4 }, to: { r: 1, c: 1 } });
    expect(metas(cells)).toEqual([{ r: 0, c: 4 }, { r: 0, c: 5 }, { r: 1, c: 0 }, { r: 1, c: 1 }]);
  });

  it("normalises so `from` precedes `to` in time", () => {
    const onSel = vi.fn();
    const { host } = mount(
      <TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} selectionShape="linear" onSelectionChange={onSel} />,
    );
    drag(host, [1, 1], [0, 4]);
    expect(lastCall(onSel)[0]).toEqual({ shape: "linear", from: { r: 0, c: 4 }, to: { r: 1, c: 1 } });
  });

  it("does not select the intervening rows a rectangle would", () => {
    const { host } = mount(
      <TimeGrid
        rows={ROWS}
        cols={COLS}
        cells={grid()}
        states={STATES}
        selection={{ shape: "linear", from: { r: 0, c: 5 }, to: { r: 2, c: 0 } }}
      />,
    );
    expect(cellEl(host, 1, 3).getAttribute("aria-selected")).toBe("true");
    expect(cellEl(host, 0, 4).getAttribute("aria-selected")).toBe("false");
    expect(cellEl(host, 2, 1).getAttribute("aria-selected")).toBe("false");
  });
});

describe("TimeGrid — disabledRange, in BOTH shapes", () => {
  const blockedAt = (br: number, bc: number) =>
    grid((r, c) => (r === br && c === bc ? { state: "booked", disabled: true, reasons: ["Booked"] } : {}));

  it("clamp (default), linear: the run stops before the first disabled cell from the anchor", () => {
    const onSel = vi.fn();
    const onBlocked = vi.fn();
    const { host } = mount(
      <TimeGrid
        rows={ROWS}
        cols={COLS}
        cells={blockedAt(0, 5)}
        states={STATES}
        selectionShape="linear"
        onSelectionChange={onSel}
        onBlockedSelect={onBlocked}
      />,
    );
    drag(host, [0, 3], [1, 1]);
    expect(lastCall(onSel)[0]).toEqual({ shape: "linear", from: { r: 0, c: 3 }, to: { r: 0, c: 4 } });
    expect(onBlocked).toHaveBeenLastCalledWith([{ r: 0, c: 5, reasons: ["Booked"] }]);
  });

  it("clamp, linear, dragged BACKWARDS: cut on the anchor's side of the block", () => {
    const onSel = vi.fn();
    const { host } = mount(
      <TimeGrid rows={ROWS} cols={COLS} cells={blockedAt(0, 5)} states={STATES} selectionShape="linear" onSelectionChange={onSel} />,
    );
    drag(host, [1, 1], [0, 3]);
    expect(lastCall(onSel)[0]).toEqual({ shape: "linear", from: { r: 1, c: 0 }, to: { r: 1, c: 1 } });
  });

  it("clamp, rectangle: the time window ends before the nearest blocked column", () => {
    const onSel = vi.fn();
    const onBlocked = vi.fn();
    const { host } = mount(
      <TimeGrid rows={ROWS} cols={COLS} cells={blockedAt(1, 3)} states={STATES} onSelectionChange={onSel} onBlockedSelect={onBlocked} />,
    );
    drag(host, [0, 0], [2, 5]);
    expect(lastCall(onSel)[0]).toEqual({ shape: "rectangle", r1: 0, c1: 0, r2: 2, c2: 2 });
    expect(onBlocked).toHaveBeenLastCalledWith([{ r: 1, c: 3, reasons: ["Booked"] }]);
  });

  it("refuse: the range is rejected whole and reported", () => {
    const onSel = vi.fn();
    const onBlocked = vi.fn();
    const { host } = mount(
      <TimeGrid
        rows={ROWS}
        cols={COLS}
        cells={blockedAt(1, 3)}
        states={STATES}
        disabledRange="refuse"
        onSelectionChange={onSel}
        onBlockedSelect={onBlocked}
      />,
    );
    drag(host, [0, 0], [2, 5]);
    // The pointerdown selected the anchor; the blocked extension never applied.
    expect(lastCall(onSel)[0]).toEqual({ shape: "rectangle", r1: 0, c1: 0, r2: 0, c2: 0 });
    expect(onBlocked).toHaveBeenLastCalledWith([{ r: 1, c: 3, reasons: ["Booked"] }]);
  });

  it("refuse, linear", () => {
    const onSel = vi.fn();
    const onBlocked = vi.fn();
    const { host } = mount(
      <TimeGrid
        rows={ROWS}
        cols={COLS}
        cells={blockedAt(0, 5)}
        states={STATES}
        selectionShape="linear"
        disabledRange="refuse"
        onSelectionChange={onSel}
        onBlockedSelect={onBlocked}
      />,
    );
    drag(host, [0, 3], [1, 1]);
    expect(lastCall(onSel)[0]).toEqual({ shape: "linear", from: { r: 0, c: 3 }, to: { r: 0, c: 3 } });
    expect(onBlocked).toHaveBeenCalled();
  });

  it("span: opt-in, the range crosses the disabled cell and includes it", () => {
    const onSel = vi.fn();
    const onBlocked = vi.fn();
    const { host } = mount(
      <TimeGrid
        rows={ROWS}
        cols={COLS}
        cells={blockedAt(0, 5)}
        states={STATES}
        selectionShape="linear"
        disabledRange="span"
        onSelectionChange={onSel}
        onBlockedSelect={onBlocked}
      />,
    );
    drag(host, [0, 3], [1, 1]);
    const [sel, cells] = lastCall(onSel);
    expect(sel).toEqual({ shape: "linear", from: { r: 0, c: 3 }, to: { r: 1, c: 1 } });
    expect(cells.some((c) => c.disabled)).toBe(true);
    expect(onBlocked).not.toHaveBeenCalled();
  });
});

describe("TimeGrid — keyboard (roving focus on the grid)", () => {
  function setup(extra: Record<string, unknown> = {}) {
    const onSel = vi.fn();
    const onCommit = vi.fn();
    const r = mount(
      <TimeGrid
        rows={ROWS}
        cols={COLS}
        cells={grid()}
        states={STATES}
        onSelectionChange={onSel}
        onSelectionCommit={onCommit}
        {...extra}
      />,
    );
    const g = gridEl(r.host);
    act(() => g.focus());
    return { ...r, g, onSel, onCommit };
  }
  const active = (g: HTMLElement) => document.getElementById(g.getAttribute("aria-activedescendant")!);

  it("the GRID takes focus, not every cell", () => {
    const { host, g } = setup();
    expect(g.tabIndex).toBe(0);
    expect(host.querySelectorAll('[role="gridcell"][tabindex]')).toHaveLength(0);
    expect(active(g)?.getAttribute("data-react-fancy-timegrid-cell")).toBe("0:0");
  });

  it("arrows move the focused cell, clamped to the grid", () => {
    const { g } = setup();
    key(g, "ArrowRight");
    key(g, "ArrowRight");
    key(g, "ArrowDown");
    expect(active(g)?.getAttribute("data-react-fancy-timegrid-cell")).toBe("1:2");
    key(g, "ArrowUp");
    key(g, "ArrowUp");
    key(g, "ArrowLeft");
    key(g, "ArrowLeft");
    key(g, "ArrowLeft");
    expect(active(g)?.getAttribute("data-react-fancy-timegrid-cell")).toBe("0:0");
  });

  it("Space selects the focused cell (it used to do nothing)", () => {
    const { g, onSel } = setup();
    key(g, "ArrowRight");
    key(g, " ");
    expect(lastCall(onSel)[0]).toEqual({ shape: "rectangle", r1: 0, c1: 1, r2: 0, c2: 1 });
  });

  it("Shift+arrows extend the range from the anchor", () => {
    const { g, onSel } = setup();
    key(g, "ArrowRight");
    key(g, " ");
    key(g, "ArrowRight", { shiftKey: true });
    key(g, "ArrowRight", { shiftKey: true });
    key(g, "ArrowDown", { shiftKey: true });
    expect(lastCall(onSel)[0]).toEqual({ shape: "rectangle", r1: 0, c1: 1, r2: 1, c2: 3 });
  });

  it("Shift+arrows extend a linear run across the row end", () => {
    const { g, onSel } = setup({ selectionShape: "linear" });
    for (let i = 0; i < 5; i++) key(g, "ArrowRight");
    key(g, " ");
    key(g, "ArrowDown", { shiftKey: true });
    expect(lastCall(onSel)[0]).toEqual({ shape: "linear", from: { r: 0, c: 5 }, to: { r: 1, c: 5 } });
    expect(lastCall(onSel)[1]).toHaveLength(7);
  });

  it("Enter commits the selection; with none it selects and commits the focused cell", () => {
    const { g, onCommit } = setup();
    key(g, "ArrowDown");
    key(g, "Enter");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][0]).toEqual({ shape: "rectangle", r1: 1, c1: 0, r2: 1, c2: 0 });
  });

  it("Escape clears", () => {
    const { g, onSel } = setup();
    key(g, " ");
    key(g, "Escape");
    expect(lastCall(onSel)).toEqual([null, []]);
  });
});

describe("TimeGrid — controlled selection", () => {
  it("renders what the host says, and only proposes changes", () => {
    const onSel = vi.fn();
    const sel: TimeGridSelection = { shape: "rectangle", r1: 2, c1: 2, r2: 2, c2: 2 };
    const { host } = mount(
      <TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} selection={sel} onSelectionChange={onSel} />,
    );
    drag(host, [0, 0], [0, 1]);
    expect(onSel).toHaveBeenCalled();
    // The host did not accept the proposal, so the render did not move.
    expect(cellEl(host, 0, 0).getAttribute("aria-selected")).toBe("false");
    expect(cellEl(host, 2, 2).getAttribute("aria-selected")).toBe("true");
  });

  it("round-trips through a host that accepts", () => {
    function Host() {
      const [s, setS] = useState<TimeGridSelection | null>(null);
      return <TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} selection={s} onSelectionChange={setS} />;
    }
    const { host } = mount(<Host />);
    drag(host, [0, 0], [1, 1]);
    expect(cellEl(host, 1, 1).getAttribute("aria-selected")).toBe("true");
    expect(cellEl(host, 2, 2).getAttribute("aria-selected")).toBe("false");
  });
});

describe("TimeGrid — hover and handles", () => {
  it("onCellHover hands the host the cell and its coordinates, then null on leave", () => {
    const onHover = vi.fn();
    const cells = grid();
    const { host } = mount(<TimeGrid rows={ROWS} cols={COLS} cells={cells} states={STATES} onCellHover={onHover} />);
    pointer(cellEl(host, 1, 4), "pointerover");
    expect(onHover).toHaveBeenLastCalledWith(cells[1][4], { r: 1, c: 4 });
    pointer(cellEl(host, 1, 4), "pointerout", { relatedTarget: document.body });
    expect(onHover).toHaveBeenLastCalledWith(null, null);
  });

  it("uses cellId for the stable handle", () => {
    const { host } = mount(
      <TimeGrid rows={ROWS} cols={COLS} cells={grid()} states={STATES} cellId={(r, c) => `slot-${r}-${c}`} />,
    );
    expect(host.querySelector('[data-react-fancy-timegrid-cell="slot-2-5"]')).not.toBeNull();
  });
});
