// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { ReorderableGrid, moveItem } from "../src/components/ReorderableGrid";
import type { ReorderableGridItem } from "../src/components/ReorderableGrid";
import { Modal } from "../src/components/Modal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * ReorderableGrid: a row-major grid of cells that a human drags (pointer or
 * keyboard) and an agent reorders through the pure `moveItem` helper.
 *
 * Requested by MOIC for a WYSIWYG field-order designer: a deal's details are a
 * 2-to-4-column grid of label/value cells, and the designer has to look like
 * that grid and reorder in place.
 */

// ─── harness ────────────────────────────────────────────────────────────────

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

type Field = ReorderableGridItem & { label: string };

const IDS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
const fields = (locked: string[] = []): Field[] =>
  IDS.map((id) => ({ id, label: `Field ${id.toUpperCase()}`, locked: locked.includes(id) }));

const render = (item: Field) => <span>{item.label}</span>;

const gridEl = (host: ParentNode = document) =>
  host.querySelector<HTMLElement>("[data-react-fancy-reorderable-grid]")!;
const cells = (host: ParentNode = document) =>
  [...host.querySelectorAll<HTMLElement>("[data-reorderable-id]")];
const order = (host: ParentNode = document) => cells(host).map((c) => c.getAttribute("data-reorderable-id"));
const cell = (id: string, host: ParentNode = document) =>
  host.querySelector<HTMLElement>(`[data-reorderable-id="${id}"]`)!;
const live = (host: ParentNode = document) =>
  host.querySelector<HTMLElement>("[data-react-fancy-reorderable-grid-live]")!.textContent;

function key(el: Element, k: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

function focus(el: HTMLElement) {
  act(() => el.focus());
}

// ─── pointer + layout simulation ────────────────────────────────────────────

/*
 * jsdom has no layout. Cells are laid out here from their CURRENT DOM position
 * among their siblings, so a live reorder moves a cell's measured box exactly
 * as the browser would: 100x50 cells with a 10px gap, row-major, `data-columns`
 * per row. The grid's own box starts at (0, 0).
 */
const CELL_W = 100;
const CELL_H = 50;
const GAP = 10;

function slotBox(el: HTMLElement) {
  const parent = el.parentElement!;
  const sibs = [...parent.querySelectorAll<HTMLElement>(":scope > [data-reorderable-id]")];
  const i = sibs.indexOf(el);
  const cols = Number(parent.getAttribute("data-columns"));
  return { left: (i % cols) * (CELL_W + GAP), top: Math.floor(i / cols) * (CELL_H + GAP) };
}

/** Client coordinates of the centre of slot `i` in a `cols`-column grid. */
function slotCentre(i: number, cols: number) {
  return {
    x: (i % cols) * (CELL_W + GAP) + CELL_W / 2,
    y: Math.floor(i / cols) * (CELL_H + GAP) + CELL_H / 2,
  };
}

const saved: Record<string, PropertyDescriptor | undefined> = {};
const LAYOUT_PROPS = ["offsetLeft", "offsetTop", "offsetWidth", "offsetHeight"] as const;
const RealPointerEvent = globalThis.PointerEvent;
const realRect = Element.prototype.getBoundingClientRect;

beforeEach(() => {
  // jsdom has no PointerEvent (fancy-slides' zoom.test.tsx pattern) and no
  // pointer capture.
  if (typeof globalThis.PointerEvent === "undefined") {
    globalThis.PointerEvent = class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    } as unknown as typeof PointerEvent;
  }
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => true);

  for (const p of LAYOUT_PROPS) {
    saved[p] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, p);
    Object.defineProperty(HTMLElement.prototype, p, {
      configurable: true,
      get(this: HTMLElement) {
        if (!this.hasAttribute("data-reorderable-id") || !this.parentElement) return 0;
        const box = slotBox(this);
        if (p === "offsetLeft") return box.left;
        if (p === "offsetTop") return box.top;
        if (p === "offsetWidth") return CELL_W;
        return CELL_H;
      },
    });
  }

  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.hasAttribute("data-react-fancy-reorderable-grid")) {
      const cols = Number(this.getAttribute("data-columns"));
      const n = this.querySelectorAll(":scope > [data-reorderable-id]").length;
      const rows = Math.ceil(n / cols);
      const width = cols * (CELL_W + GAP) - GAP;
      const height = rows * (CELL_H + GAP) - GAP;
      return { left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON() {} } as DOMRect;
    }
    return realRect.call(this);
  };
});

afterEach(() => {
  for (const p of LAYOUT_PROPS) {
    if (saved[p]) Object.defineProperty(HTMLElement.prototype, p, saved[p]!);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[p];
  }
  Element.prototype.getBoundingClientRect = realRect;
  globalThis.PointerEvent = RealPointerEvent;
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function pointer(el: Element, type: string, x: number, y: number, pointerId = 1) {
  act(() => {
    el.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId }),
    );
  });
}

/** Press on a cell, then move (captured: moves and the release go to the grid root). */
function dragTo(from: HTMLElement, start: { x: number; y: number }, path: { x: number; y: number }[]) {
  pointer(from, "pointerdown", start.x, start.y);
  for (const p of path) pointer(gridEl(), "pointermove", p.x, p.y);
}

// ─── moveItem ───────────────────────────────────────────────────────────────

describe("moveItem — the pure helper an agent bridge reorders with", () => {
  it("moves the first item to the end", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 3)).toEqual(["b", "c", "d", "a"]);
  });

  it("moves the last item to the front", () => {
    expect(moveItem(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("moves forward across a row boundary (4 columns: row 1 col 2 to row 2 col 3)", () => {
    // index 1 -> index 6. Items between shift back by one, wrapping from row 2
    // to row 1 at the boundary.
    expect(moveItem(IDS, 1, 6)).toEqual(["a", "c", "d", "e", "f", "g", "b", "h", "i", "j"]);
  });

  it("moves backward across a row boundary", () => {
    expect(moveItem(IDS, 8, 2)).toEqual(["a", "b", "i", "c", "d", "e", "f", "g", "h", "j"]);
  });

  it("returns an equal copy for a same-index move and never mutates the input", () => {
    const input = ["a", "b", "c"];
    const out = moveItem(input, 1, 1);
    expect(out).toEqual(["a", "b", "c"]);
    expect(out).not.toBe(input);

    moveItem(input, 0, 2);
    expect(input).toEqual(["a", "b", "c"]);
  });

  it("throws on an index outside the list, rather than silently doing nothing", () => {
    expect(() => moveItem(["a", "b"], 0, 2)).toThrow(RangeError);
    expect(() => moveItem(["a", "b"], -1, 0)).toThrow(RangeError);
    expect(() => moveItem(["a", "b"], 0.5, 1)).toThrow(RangeError);
  });

  it("keeps locked items at their absolute index; the rest flow around them", () => {
    // c is pinned at index 2. a moves to index 3: b and d close up around c.
    expect(moveItem(["a", "b", "c", "d", "e"], 0, 3, { locked: ["c"] })).toEqual(["b", "d", "c", "a", "e"]);
    // A long move past two pinned cells.
    expect(moveItem(IDS, 0, 9, { locked: ["c", "g"] })).toEqual(["b", "d", "c", "e", "f", "h", "g", "i", "j", "a"]);
    // Backward past a pinned cell.
    expect(moveItem(["a", "b", "c", "d", "e"], 4, 0, { locked: ["c"] })).toEqual(["e", "a", "c", "b", "d"]);
  });

  it("refuses to move a locked item, or to drop onto a locked slot", () => {
    expect(moveItem(["a", "b", "c"], 2, 0, { locked: ["c"] })).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 0, 2, { locked: ["c"] })).toEqual(["a", "b", "c"]);
  });

  it("accepts a predicate for locked", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 3, { locked: (id) => id === "b" })).toEqual(["c", "b", "d", "a"]);
  });
});

// ─── structure + handles ────────────────────────────────────────────────────

describe("ReorderableGrid — structure and stable handles", () => {
  it("renders the root handle, one cell per item, row-major, with id and index handles", () => {
    const view = mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} label="Deal fields" />);
    const root = gridEl(view.host);

    expect(root).not.toBeNull();
    expect(root.getAttribute("data-columns")).toBe("4");
    expect(root.getAttribute("data-state")).toBe("idle");
    expect(root.getAttribute("aria-label")).toBe("Deal fields");
    expect(root.className).toContain("grid-cols-4");

    expect(order(view.host)).toEqual(IDS);
    cells(view.host).forEach((c, i) => {
      expect(c.getAttribute("data-index")).toBe(String(i));
      expect(c.getAttribute("data-state")).toBe("idle");
      expect(c.hasAttribute("data-react-fancy-reorderable-grid-item")).toBe(true);
    });
    expect(cell("c", view.host).textContent).toBe("Field C");
    view.unmount();
  });

  it("passes position state to renderItem (1-based position, row, column)", () => {
    const seen: Record<string, unknown> = {};
    mount(
      <ReorderableGrid
        items={fields()}
        columns={4}
        renderItem={(item, state) => {
          seen[item.id] = { index: state.index, position: state.position, row: state.row, column: state.column };
          return item.label;
        }}
      />,
    );
    expect(seen.a).toEqual({ index: 0, position: 1, row: 1, column: 1 });
    expect(seen.f).toEqual({ index: 5, position: 6, row: 2, column: 2 });
    expect(seen.j).toEqual({ index: 9, position: 10, row: 3, column: 2 });
  });

  it("uses one tab stop (roving tabindex) and arrow keys move focus in 2-D when nothing is picked up", () => {
    const view = mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} />);
    const tabStops = cells(view.host).filter((c) => c.tabIndex === 0);
    expect(tabStops.map((c) => c.getAttribute("data-reorderable-id"))).toEqual(["a"]);

    focus(cell("a"));
    key(cell("a"), "ArrowDown");
    expect(document.activeElement).toBe(cell("e"));
    key(cell("e"), "ArrowRight");
    expect(document.activeElement).toBe(cell("f"));
    // Focus navigation never reorders.
    expect(order()).toEqual(IDS);
    view.unmount();
  });
});

// ─── keyboard reordering ────────────────────────────────────────────────────

describe("ReorderableGrid — keyboard reordering", () => {
  it("Space picks up, arrows preview a 2-D move, Space drops and reports the full order once", () => {
    const onReorder = vi.fn();
    const view = mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);

    focus(cell("a"));
    key(cell("a"), " ");
    expect(cell("a").getAttribute("data-state")).toBe("picked-up");
    expect(gridEl().getAttribute("data-state")).toBe("picked-up");
    expect(cell("a").getAttribute("aria-pressed")).toBe("true");

    key(cell("a"), "ArrowRight");
    expect(order()).toEqual(["b", "a", "c", "d", "e", "f", "g", "h", "i", "j"]);
    key(cell("a"), "ArrowDown");
    // index 1 -> index 5: row 2, column 2.
    expect(order()).toEqual(["b", "c", "d", "e", "f", "a", "g", "h", "i", "j"]);
    expect(cell("a").getAttribute("data-index")).toBe("5");
    expect(gridEl().getAttribute("data-drop-index")).toBe("5");
    expect(cell("a").hasAttribute("data-drop-target")).toBe(true);
    // A preview is not a change: nothing reported yet.
    expect(onReorder).not.toHaveBeenCalled();
    // Focus follows the moved cell, even though React moved its DOM node.
    expect(document.activeElement).toBe(cell("a"));
    // jsdom keeps focus on a moved node; Chromium can drop it. Drop it by hand
    // and the next move must put it back.
    act(() => cell("a").blur());
    expect(document.activeElement).not.toBe(cell("a"));
    key(cell("a"), "ArrowLeft");
    expect(document.activeElement).toBe(cell("a"));
    key(cell("a"), "ArrowRight");

    key(cell("a"), " ");
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "d", "e", "f", "a", "g", "h", "i", "j"]);
    expect(cell("a").getAttribute("data-state")).toBe("idle");
    expect(gridEl().getAttribute("data-state")).toBe("idle");
    expect(order()).toEqual(["b", "c", "d", "e", "f", "a", "g", "h", "i", "j"]);
    view.unmount();
  });

  it("Enter picks up and drops too; Up moves one row back; Left one cell", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);

    focus(cell("j"));
    key(cell("j"), "Enter");
    key(cell("j"), "ArrowUp"); // 9 -> 5
    key(cell("j"), "ArrowLeft"); // 5 -> 4
    key(cell("j"), "Enter");
    expect(onReorder).toHaveBeenCalledWith(["a", "b", "c", "d", "j", "e", "f", "g", "h", "i"]);
  });

  it("does not move past the edges", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);

    focus(cell("a"));
    key(cell("a"), " ");
    key(cell("a"), "ArrowLeft");
    key(cell("a"), "ArrowUp");
    expect(order()).toEqual(IDS);
    key(cell("a"), " ");
    // Dropped where it started: no change, no report.
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("Down from a row above a short last row lands on the last item", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);
    // h is index 7 (row 2, column 4); row 3 only has two cells (8, 9).
    focus(cell("h"));
    key(cell("h"), " ");
    key(cell("h"), "ArrowDown");
    key(cell("h"), " ");
    expect(onReorder).toHaveBeenCalledWith(["a", "b", "c", "d", "e", "f", "g", "i", "j", "h"]);
  });

  it("Escape cancels: the original order is restored and onReorder is never called", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);

    focus(cell("b"));
    key(cell("b"), " ");
    key(cell("b"), "ArrowRight");
    key(cell("b"), "ArrowDown");
    expect(order()).not.toEqual(IDS);

    key(cell("b"), "Escape");
    expect(order()).toEqual(IDS);
    expect(cell("b").getAttribute("data-state")).toBe("idle");
    expect(onReorder).not.toHaveBeenCalled();

    // And a later Space starts a fresh pick-up rather than dropping a stale one.
    key(cell("b"), " ");
    key(cell("b"), " ");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("Escape goes through the layer stack: inside a Modal it cancels the pick-up first, the Modal second", () => {
    const onClose = vi.fn();
    const onReorder = vi.fn();
    mount(
      <Modal open onClose={onClose}>
        <Modal.Body>
          <ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />
        </Modal.Body>
      </Modal>,
    );

    focus(cell("a"));
    key(cell("a"), " ");
    key(cell("a"), "ArrowRight");

    key(cell("a"), "Escape");
    expect(order()).toEqual(IDS);
    expect(onClose).not.toHaveBeenCalled();

    key(cell("a"), "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("ignores keys typed into an interactive element inside a cell", () => {
    const onReorder = vi.fn();
    mount(
      <ReorderableGrid
        items={fields()}
        columns={4}
        onReorder={onReorder}
        renderItem={(item) => <input aria-label={item.label} data-testid={`in-${item.id}`} />}
      />,
    );
    const input = document.querySelector<HTMLInputElement>('[data-testid="in-a"]')!;
    focus(input);
    key(input, " ");
    expect(cell("a").getAttribute("data-state")).toBe("idle");
  });
});

// ─── aria-live ──────────────────────────────────────────────────────────────

describe("ReorderableGrid — announcements", () => {
  it("announces pick-up, each move with position/row/column, and the drop", () => {
    mount(<ReorderableGrid items={fields().slice(0, 8)} columns={4} renderItem={render} />);
    const region = document.querySelector("[data-react-fancy-reorderable-grid-live]")!;
    expect(region.getAttribute("aria-live")).toBe("assertive");

    focus(cell("a"));
    key(cell("a"), " ");
    expect(live()).toContain("Picked up Field A");
    expect(live()).toContain("position 1 of 8");

    key(cell("a"), "ArrowRight");
    key(cell("a"), "ArrowRight");
    expect(live()).toBe("Moved to position 3 of 8, row 1 column 3");

    key(cell("a"), "ArrowDown");
    expect(live()).toBe("Moved to position 7 of 8, row 2 column 3");

    key(cell("a"), " ");
    expect(live()).toBe("Dropped Field A at position 7 of 8, row 2 column 3");
  });

  it("announces a cancel with the restored position", () => {
    mount(<ReorderableGrid items={fields().slice(0, 8)} columns={4} renderItem={render} />);
    focus(cell("c"));
    key(cell("c"), " ");
    key(cell("c"), "ArrowRight");
    key(cell("c"), "Escape");
    expect(live()).toBe("Cancelled. Field C returned to position 3 of 8, row 1 column 3");
  });

  it("every message is overridable for i18n", () => {
    mount(
      <ReorderableGrid
        items={fields().slice(0, 8)}
        columns={4}
        renderItem={render}
        labels={{
          pickedUp: (c) => `Aufgenommen: ${c.label}`,
          moved: (c) => `Position ${c.position} von ${c.total}, Zeile ${c.row} Spalte ${c.column}`,
          dropped: (c) => `Abgelegt: ${c.label}`,
          instructions: "Leertaste zum Aufnehmen",
        }}
      />,
    );
    focus(cell("a"));
    key(cell("a"), " ");
    expect(live()).toBe("Aufgenommen: Field A");
    key(cell("a"), "ArrowRight");
    expect(live()).toBe("Position 2 von 8, Zeile 1 Spalte 2");
    key(cell("a"), " ");
    expect(live()).toBe("Abgelegt: Field A");
    const describedBy = cell("a").getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)!.textContent).toBe("Leertaste zum Aufnehmen");
  });

  it("uses getItemLabel when items have no label field", () => {
    mount(
      <ReorderableGrid
        items={[{ id: "x1", name: "Amount" }, { id: "x2", name: "Stage" }]}
        columns={2}
        getItemLabel={(item) => item.name}
        renderItem={(item) => item.name}
      />,
    );
    focus(cell("x1"));
    key(cell("x1"), " ");
    expect(live()).toContain("Picked up Amount");
  });
});

// ─── locked ─────────────────────────────────────────────────────────────────

describe("ReorderableGrid — locked items", () => {
  it("a locked cell cannot be picked up, and says why", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields(["c"])} columns={4} renderItem={render} onReorder={onReorder} />);
    expect(cell("c").getAttribute("data-locked")).toBe("true");

    focus(cell("c"));
    key(cell("c"), " ");
    expect(cell("c").getAttribute("data-state")).toBe("idle");
    expect(live()).toBe("Field C is locked and cannot be moved");
  });

  it("keyboard moves skip over a locked cell, which never leaves its slot", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields(["c"])} columns={4} renderItem={render} onReorder={onReorder} />);

    focus(cell("a"));
    key(cell("a"), " ");
    key(cell("a"), "ArrowRight"); // -> 1
    expect(order()[2]).toBe("c");
    key(cell("a"), "ArrowRight"); // slot 2 is pinned -> 3
    expect(order()).toEqual(["b", "d", "c", "a", "e", "f", "g", "h", "i", "j"]);
    expect(live()).toBe("Moved to position 4 of 10, row 1 column 4");
    key(cell("a"), " ");
    expect(onReorder).toHaveBeenCalledWith(["b", "d", "c", "a", "e", "f", "g", "h", "i", "j"]);
  });

  it("Down onto a locked slot goes to the next free slot after it", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields(["e"])} columns={4} renderItem={render} onReorder={onReorder} />);
    focus(cell("a"));
    key(cell("a"), " ");
    key(cell("a"), "ArrowDown"); // slot 4 is pinned -> 5
    key(cell("a"), " ");
    const out = onReorder.mock.calls[0][0] as string[];
    expect(out.indexOf("a")).toBe(5);
    expect(out.indexOf("e")).toBe(4);
  });

  it("a pointer drag over a locked cell leaves it in place", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields(["c"])} columns={4} renderItem={render} onReorder={onReorder} />);
    const s = slotCentre(0, 4);
    dragTo(cell("a"), s, [{ x: s.x + 10, y: s.y }, slotCentre(2, 4)]);
    // Hovering the pinned slot is not a target: the preview stays where it was,
    // the drop index does not claim the pinned slot, and nothing is announced
    // as a move there.
    expect(order()).toEqual(IDS);
    expect(gridEl().getAttribute("data-drop-index")).toBe("0");
    expect(live()).not.toContain("position 3");
    // Slot 3 is free: a lands there and c is still at 2.
    pointer(gridEl(), "pointermove", slotCentre(3, 4).x, slotCentre(3, 4).y);
    expect(order()).toEqual(["b", "d", "c", "a", "e", "f", "g", "h", "i", "j"]);
    pointer(gridEl(), "pointerup", slotCentre(3, 4).x, slotCentre(3, 4).y);
    expect(onReorder).toHaveBeenCalledWith(["b", "d", "c", "a", "e", "f", "g", "h", "i", "j"]);
  });

  it("a locked cell does not start a pointer drag", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields(["a"])} columns={4} renderItem={render} onReorder={onReorder} />);
    const s = slotCentre(0, 4);
    dragTo(cell("a"), s, [{ x: s.x + 20, y: s.y }, slotCentre(6, 4)]);
    expect(cell("a").getAttribute("data-state")).toBe("idle");
    pointer(gridEl(), "pointerup", slotCentre(6, 4).x, slotCentre(6, 4).y);
    expect(order()).toEqual(IDS);
    expect(onReorder).not.toHaveBeenCalled();
  });
});

// ─── controlled / uncontrolled ──────────────────────────────────────────────

describe("ReorderableGrid — controlled and uncontrolled", () => {
  function pickMoveDrop(id: string, keys: string[]) {
    focus(cell(id));
    key(cell(id), " ");
    for (const k of keys) key(cell(id), k);
    key(cell(id), " ");
  }

  it("controlled: `value` owns the order; a parent that ignores onReorder keeps it", () => {
    const onReorder = vi.fn();
    const value = ["j", "i", "h", "g", "f", "e", "d", "c", "b", "a"];
    mount(<ReorderableGrid items={fields()} value={value} columns={4} renderItem={render} onReorder={onReorder} />);
    expect(order()).toEqual(value);

    pickMoveDrop("j", ["ArrowRight"]);
    expect(onReorder).toHaveBeenCalledWith(["i", "j", "h", "g", "f", "e", "d", "c", "b", "a"]);
    // Not applied by the parent: the grid shows `value`, not its own guess.
    expect(order()).toEqual(value);
  });

  it("controlled: a parent that applies onReorder moves the grid, and external value changes show", () => {
    function Host() {
      const [value, setValue] = useState(IDS);
      return (
        <>
          <button type="button" data-testid="reverse" onClick={() => setValue([...value].reverse())} />
          <ReorderableGrid items={fields()} value={value} onReorder={setValue} columns={4} renderItem={render} />
        </>
      );
    }
    mount(<Host />);
    pickMoveDrop("a", ["ArrowRight"]);
    expect(order()).toEqual(["b", "a", "c", "d", "e", "f", "g", "h", "i", "j"]);

    act(() => document.querySelector<HTMLButtonElement>('[data-testid="reverse"]')!.click());
    expect(order()).toEqual(["j", "i", "h", "g", "f", "e", "d", "c", "a", "b"]);
  });

  it("uncontrolled: starts from defaultValue (or items order) and keeps its own order", () => {
    const onReorder = vi.fn();
    const view = mount(
      <ReorderableGrid items={fields()} defaultValue={["b", "a"]} columns={4} renderItem={render} onReorder={onReorder} />,
    );
    // Ids missing from defaultValue follow in items order.
    expect(order()).toEqual(["b", "a", "c", "d", "e", "f", "g", "h", "i", "j"]);

    pickMoveDrop("b", ["ArrowRight"]);
    expect(onReorder).toHaveBeenCalledWith(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);
    expect(order()).toEqual(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);
    view.unmount();
  });

  it("reconciles: unknown ids in value are dropped, new items are appended", () => {
    const view = mount(
      <ReorderableGrid items={fields().slice(0, 3)} value={["c", "zz", "a"]} columns={4} renderItem={render} />,
    );
    expect(order()).toEqual(["c", "a", "b"]);
    view.rerender(<ReorderableGrid items={fields().slice(0, 4)} value={["c", "zz", "a"]} columns={4} renderItem={render} />);
    expect(order()).toEqual(["c", "a", "b", "d"]);
    view.unmount();
  });
});

// ─── pointer ────────────────────────────────────────────────────────────────

describe("ReorderableGrid — pointer drag", () => {
  it("drags cell 1 to position 7 across rows with a live preview, and reports on release", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);

    const start = slotCentre(0, 4);
    dragTo(cell("a"), start, [{ x: start.x + 20, y: start.y + 5 }]);
    expect(cell("a").getAttribute("data-state")).toBe("dragging");
    expect(gridEl().getAttribute("data-state")).toBe("dragging");
    expect(Element.prototype.setPointerCapture).toHaveBeenCalled();

    // Into slot 5 (row 2, column 2), then on to slot 6 (row 2, column 3).
    pointer(gridEl(), "pointermove", slotCentre(5, 4).x, slotCentre(5, 4).y);
    expect(order()).toEqual(["b", "c", "d", "e", "f", "a", "g", "h", "i", "j"]);
    pointer(gridEl(), "pointermove", slotCentre(6, 4).x, slotCentre(6, 4).y);
    expect(order()).toEqual(["b", "c", "d", "e", "f", "g", "a", "h", "i", "j"]);
    expect(gridEl().getAttribute("data-drop-index")).toBe("6");
    expect(onReorder).not.toHaveBeenCalled();

    // The dragged cell follows the pointer through a transform, measured from
    // where it STARTED, not from the slot it now occupies.
    const t = cell("a").style.transform;
    const m = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(t)!;
    const now = slotCentre(6, 4);
    const slot6 = { left: 2 * (CELL_W + GAP), top: 1 * (CELL_H + GAP) };
    expect(Number(m[1])).toBe(0 + (now.x - start.x) - slot6.left);
    expect(Number(m[2])).toBe(0 + (now.y - start.y) - slot6.top);

    pointer(gridEl(), "pointerup", now.x, now.y);
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "d", "e", "f", "g", "a", "h", "i", "j"]);
    expect(cell("a").getAttribute("data-state")).toBe("idle");
    expect(gridEl().getAttribute("data-state")).toBe("idle");
    // The transform was transient.
    expect(cell("a").style.transform).toBe("");
  });

  it("a drop in the gap between cells lands on the nearest cell", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);
    const start = slotCentre(0, 4);
    // Just inside the 10px gap to the right of slot 2, nearer slot 2.
    dragTo(cell("a"), start, [{ x: start.x + 20, y: start.y }, { x: 2 * 110 + CELL_W + 3, y: start.y }]);
    pointer(gridEl(), "pointerup", 2 * 110 + CELL_W + 3, start.y);
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a", "d", "e", "f", "g", "h", "i", "j"]);
  });

  it("a drag that ends outside the grid cancels and restores the order", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);
    const start = slotCentre(0, 4);
    dragTo(cell("a"), start, [{ x: start.x + 20, y: start.y }, slotCentre(6, 4)]);
    expect(order()).not.toEqual(IDS);

    pointer(gridEl(), "pointermove", 900, 900);
    // While outside, the preview shows the order a release would keep.
    expect(order()).toEqual(IDS);
    expect(gridEl().hasAttribute("data-drop-index")).toBe(false);

    pointer(gridEl(), "pointerup", 900, 900);
    expect(onReorder).not.toHaveBeenCalled();
    expect(order()).toEqual(IDS);
    expect(cell("a").style.transform).toBe("");
  });

  it("a press without movement is a click, not a drag", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);
    const s = slotCentre(0, 4);
    pointer(cell("a"), "pointerdown", s.x, s.y);
    pointer(gridEl(), "pointermove", s.x + 2, s.y + 1);
    expect(cell("a").getAttribute("data-state")).toBe("idle");
    pointer(gridEl(), "pointerup", s.x + 2, s.y + 1);
    expect(onReorder).not.toHaveBeenCalled();
    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();
  });

  it("Escape during a pointer drag cancels it", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);
    const start = slotCentre(0, 4);
    dragTo(cell("a"), start, [{ x: start.x + 20, y: start.y }, slotCentre(6, 4)]);
    key(document.body, "Escape");
    expect(order()).toEqual(IDS);
    pointer(gridEl(), "pointerup", slotCentre(6, 4).x, slotCentre(6, 4).y);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("pointercancel cancels", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} />);
    const start = slotCentre(0, 4);
    dragTo(cell("a"), start, [{ x: start.x + 20, y: start.y }, slotCentre(6, 4)]);
    pointer(gridEl(), "pointercancel", 0, 0);
    expect(order()).toEqual(IDS);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("a 2-column grid wraps row-major", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields().slice(0, 6)} columns={2} renderItem={render} onReorder={onReorder} />);
    const start = slotCentre(0, 2);
    // Slot 3 is row 2, column 2 in a 2-column grid.
    dragTo(cell("a"), start, [{ x: start.x + 20, y: start.y }, slotCentre(3, 2)]);
    pointer(gridEl(), "pointerup", slotCentre(3, 2).x, slotCentre(3, 2).y);
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "d", "a", "e", "f"]);
  });

  it("with a [data-reorderable-handle] inside, only the handle starts a drag", () => {
    const onReorder = vi.fn();
    mount(
      <ReorderableGrid
        items={fields()}
        columns={4}
        onReorder={onReorder}
        renderItem={(item, state) => (
          <>
            <span data-testid={`grip-${item.id}`} {...state.handleProps}>
              ::
            </span>
            <span data-testid={`body-${item.id}`}>{item.label}</span>
          </>
        )}
      />,
    );
    const start = slotCentre(0, 4);
    const body = document.querySelector<HTMLElement>('[data-testid="body-a"]')!;
    dragTo(body, start, [{ x: start.x + 20, y: start.y }, slotCentre(6, 4)]);
    pointer(gridEl(), "pointerup", slotCentre(6, 4).x, slotCentre(6, 4).y);
    expect(onReorder).not.toHaveBeenCalled();

    const grip = document.querySelector<HTMLElement>('[data-testid="grip-a"]')!;
    expect(grip.hasAttribute("data-reorderable-handle")).toBe(true);
    dragTo(grip, start, [{ x: start.x + 20, y: start.y }, slotCentre(6, 4)]);
    pointer(gridEl(), "pointerup", slotCentre(6, 4).x, slotCentre(6, 4).y);
    expect(onReorder).toHaveBeenCalledTimes(1);
  });
});

// ─── disabled ───────────────────────────────────────────────────────────────

describe("ReorderableGrid — disabled", () => {
  it("takes no keyboard or pointer input and leaves no tab stop", () => {
    const onReorder = vi.fn();
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} onReorder={onReorder} disabled />);
    expect(gridEl().hasAttribute("data-disabled")).toBe(true);
    expect(cells().filter((c) => c.tabIndex === 0)).toEqual([]);

    key(cell("a"), " ");
    expect(cell("a").getAttribute("data-state")).toBe("idle");

    const start = slotCentre(0, 4);
    dragTo(cell("a"), start, [{ x: start.x + 20, y: start.y }, slotCentre(6, 4)]);
    pointer(gridEl(), "pointerup", slotCentre(6, 4).x, slotCentre(6, 4).y);
    expect(order()).toEqual(IDS);
    expect(onReorder).not.toHaveBeenCalled();
  });
});

// ─── styling ────────────────────────────────────────────────────────────────

describe("ReorderableGrid — styles", () => {
  it("leaves no inline style at rest, and carries dark variants on the default cell", () => {
    mount(<ReorderableGrid items={fields()} columns={4} renderItem={render} />);
    expect(gridEl().getAttribute("style")).toBeNull();
    for (const c of cells()) expect(c.getAttribute("style")).toBeNull();
    expect(cell("a").className).toMatch(/dark:/);
    expect(cell("a").className).toContain("--fancy-surface");
  });
});
