import type {
  TimeGridCoord,
  TimeGridDisabledRange,
  TimeGridSelection,
  TimeGridSelectionShape,
} from "./TimeGrid.types";

/**
 * Pure selection arithmetic for the typed TimeGrid. No React, no DOM: every
 * selection is DERIVED from an anchor and a target cell, never accumulated
 * from the cells a pointer happened to visit (which is how a fast drag used to
 * leave gaps).
 */

export type IsDisabled = (r: number, c: number) => boolean;

/** Rectangle from two corners, normalised; linear run from two ends, normalised. */
export function selectionBetween(
  shape: TimeGridSelectionShape,
  a: TimeGridCoord,
  b: TimeGridCoord,
  nCols: number,
): TimeGridSelection {
  if (shape === "linear") {
    const ia = a.r * nCols + a.c;
    const ib = b.r * nCols + b.c;
    return ia <= ib
      ? { shape: "linear", from: { r: a.r, c: a.c }, to: { r: b.r, c: b.c } }
      : { shape: "linear", from: { r: b.r, c: b.c }, to: { r: a.r, c: a.c } };
  }
  return {
    shape: "rectangle",
    r1: Math.min(a.r, b.r),
    c1: Math.min(a.c, b.c),
    r2: Math.max(a.r, b.r),
    c2: Math.max(a.c, b.c),
  };
}

/** The columns `[start, end]` of row `r` inside `sel`, or null. */
export function rowSegment(
  sel: TimeGridSelection | null | undefined,
  r: number,
  nCols: number,
): [number, number] | null {
  if (!sel) return null;
  if (sel.shape === "rectangle") {
    return r >= sel.r1 && r <= sel.r2 ? [sel.c1, sel.c2] : null;
  }
  const { from, to } = sel;
  if (r < from.r || r > to.r) return null;
  const start = r === from.r ? from.c : 0;
  const end = r === to.r ? to.c : nCols - 1;
  return start <= end ? [start, end] : null;
}

/** Every coordinate in `sel`, in selection order (row-major). */
export function selectionCoords(
  sel: TimeGridSelection | null | undefined,
  nRows: number,
  nCols: number,
): TimeGridCoord[] {
  const out: TimeGridCoord[] = [];
  if (!sel) return out;
  const rFrom = sel.shape === "rectangle" ? sel.r1 : sel.from.r;
  const rTo = sel.shape === "rectangle" ? sel.r2 : sel.to.r;
  for (let r = Math.max(0, rFrom); r <= Math.min(nRows - 1, rTo); r++) {
    const seg = rowSegment(sel, r, nCols);
    if (!seg) continue;
    for (let c = Math.max(0, seg[0]); c <= Math.min(nCols - 1, seg[1]); c++) out.push({ r, c });
  }
  return out;
}

export function sameSelection(
  a: TimeGridSelection | null | undefined,
  b: TimeGridSelection | null | undefined,
): boolean {
  if (!a || !b) return !a && !b;
  if (a.shape === "rectangle" && b.shape === "rectangle") {
    return a.r1 === b.r1 && a.c1 === b.c1 && a.r2 === b.r2 && a.c2 === b.c2;
  }
  if (a.shape === "linear" && b.shape === "linear") {
    return a.from.r === b.from.r && a.from.c === b.from.c && a.to.r === b.to.r && a.to.c === b.to.c;
  }
  return false;
}

export type ResolvedRange =
  /** Apply this selection. `blocked` lists disabled cells it was clipped by. */
  | { kind: "select"; selection: TimeGridSelection; blocked: TimeGridCoord[] }
  /** Leave the selection as it was; report `blocked`. */
  | { kind: "refuse"; blocked: TimeGridCoord[] };

/**
 * Resolve anchor -> target under the `disabledRange` policy.
 *
 * - `span`:   the requested range, disabled cells included. Nothing is reported.
 * - `refuse`: the requested range if it holds no disabled cell, else nothing.
 * - `clamp`:  cut on the ANCHOR's side of the nearest block.
 *     linear    — the run stops before the first disabled cell walking from
 *                 the anchor toward the target, in time order.
 *     rectangle — the time window (columns) ends before the nearest column,
 *                 from the anchor, that holds a disabled cell in any selected
 *                 row. If the anchor's own column is blocked, the row span is
 *                 cut first, before the nearest row blocked in that column.
 *
 * A disabled anchor is refused under `clamp` and `refuse` alike.
 */
export function resolveRange(
  shape: TimeGridSelectionShape,
  anchor: TimeGridCoord,
  target: TimeGridCoord,
  nRows: number,
  nCols: number,
  isDisabled: IsDisabled,
  policy: TimeGridDisabledRange,
): ResolvedRange {
  const requested = selectionBetween(shape, anchor, target, nCols);
  if (policy === "span") return { kind: "select", selection: requested, blocked: [] };

  const blocked = selectionCoords(requested, nRows, nCols).filter(({ r, c }) => isDisabled(r, c));
  if (blocked.length === 0) return { kind: "select", selection: requested, blocked };
  if (policy === "refuse" || isDisabled(anchor.r, anchor.c)) return { kind: "refuse", blocked };

  if (shape === "linear") {
    const ia = anchor.r * nCols + anchor.c;
    const it = target.r * nCols + target.c;
    const step = it >= ia ? 1 : -1;
    let last = ia;
    for (let i = ia + step; step > 0 ? i <= it : i >= it; i += step) {
      if (isDisabled(Math.floor(i / nCols), i % nCols)) break;
      last = i;
    }
    const end = { r: Math.floor(last / nCols), c: last % nCols };
    return { kind: "select", selection: selectionBetween("linear", anchor, end, nCols), blocked };
  }

  const rStep = target.r >= anchor.r ? 1 : -1;
  const cStep = target.c >= anchor.c ? 1 : -1;
  const colBlocked = (c: number, rEnd: number) => {
    for (let r = anchor.r; rStep > 0 ? r <= rEnd : r >= rEnd; r += rStep) {
      if (isDisabled(r, c)) return true;
    }
    return false;
  };

  let rEnd = target.r;
  if (colBlocked(anchor.c, rEnd)) {
    rEnd = anchor.r;
    for (let r = anchor.r + rStep; rStep > 0 ? r <= target.r : r >= target.r; r += rStep) {
      if (isDisabled(r, anchor.c)) break;
      rEnd = r;
    }
  }
  let cEnd = anchor.c;
  for (let c = anchor.c + cStep; cStep > 0 ? c <= target.c : c >= target.c; c += cStep) {
    if (colBlocked(c, rEnd)) break;
    cEnd = c;
  }
  return {
    kind: "select",
    selection: selectionBetween("rectangle", anchor, { r: rEnd, c: cEnd }, nCols),
    blocked,
  };
}
