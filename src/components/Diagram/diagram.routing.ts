/**
 * Orthogonal (Manhattan) routing for DiagramRelation.
 *
 * Given a source rect, target rect, and a list of obstacle rects, produces
 * a polyline of right-angle segments that connects the rects without
 * crossing through any obstacle (where possible).
 *
 * Strategy:
 *  1. Pick the side of each rect that faces the other ("side-snap").
 *  2. Stub out perpendicularly from each side by a fixed amount.
 *  3. Connect the two stubs with one or two right-angle elbows.
 *  4. Walk each segment and detour around any obstacle box it intersects.
 *
 * Good enough for most ERD/UML diagrams. For dense graphs where elbows
 * still cross, a full A* grid router is the next step (planned).
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Side = "top" | "bottom" | "left" | "right";

export interface Anchor {
  side: Side;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

const STUB = 24; // how far the line stubs out perpendicular to a node side
const DODGE_PADDING = 16; // safety margin when routing around an obstacle
const MAX_DODGE_ITERATIONS = 6;

/* ------------------------------------------------------------------ */
/* Anchor selection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Pick the best (side, point) anchors on `from` and `to` so the straight
 * line between them is approximately the shortest. If `fromY`/`toY` are
 * supplied, they're used as the y-offset for left/right anchors (e.g.
 * field-level row Y for ERD). They're ignored for top/bottom anchors.
 */
export function pickAnchors(from: Rect, to: Rect, fromY?: number, toY?: number): {
  from: Anchor;
  to: Anchor;
} {
  const fcx = from.x + from.width / 2;
  const fcy = from.y + from.height / 2;
  const tcx = to.x + to.width / 2;
  const tcy = to.y + to.height / 2;
  const dx = tcx - fcx;
  const dy = tcy - fcy;

  let fromSide: Side, toSide: Side;
  if (Math.abs(dx) >= Math.abs(dy)) {
    fromSide = dx >= 0 ? "right" : "left";
    toSide = dx >= 0 ? "left" : "right";
  } else {
    fromSide = dy >= 0 ? "bottom" : "top";
    toSide = dy >= 0 ? "top" : "bottom";
  }

  return {
    from: anchorOnSide(from, fromSide, fromY),
    to: anchorOnSide(to, toSide, toY),
  };
}

function anchorOnSide(box: Rect, side: Side, fieldY?: number): Anchor {
  switch (side) {
    case "right":
      return { side, x: box.x + box.width, y: box.y + (fieldY ?? box.height / 2) };
    case "left":
      return { side, x: box.x, y: box.y + (fieldY ?? box.height / 2) };
    case "top":
      return { side, x: box.x + box.width / 2, y: box.y };
    case "bottom":
      return { side, x: box.x + box.width / 2, y: box.y + box.height };
  }
}

/** Move a point STUB units perpendicularly outward from a side. */
function stubOut(a: Anchor, distance = STUB): Point {
  switch (a.side) {
    case "right": return { x: a.x + distance, y: a.y };
    case "left": return { x: a.x - distance, y: a.y };
    case "top": return { x: a.x, y: a.y - distance };
    case "bottom": return { x: a.x, y: a.y + distance };
  }
}

/* ------------------------------------------------------------------ */
/* Path generation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Build a Manhattan polyline between two anchors. When `obstacles` is
 * supplied, the elbow midpoint is shifted so it doesn't fall inside any
 * obstacle that lies along the path's Y/X span.
 *
 * Returns ≥3 points (start, ≥1 elbow, end). All segments are horizontal
 * or vertical.
 */
export function manhattanPath(from: Anchor, to: Anchor, obstacles: Rect[] = []): Point[] {
  const f = { x: from.x, y: from.y };
  const t = { x: to.x, y: to.y };
  const fs = stubOut(from);
  const ts = stubOut(to);

  const fHoriz = from.side === "left" || from.side === "right";
  const tHoriz = to.side === "left" || to.side === "right";

  // Both anchors are on horizontal sides — go via a vertical mid-line.
  if (fHoriz && tHoriz) {
    const midX = pickClearMidX((fs.x + ts.x) / 2, fs.y, ts.y, obstacles);
    return uniqPath([
      f,
      fs,
      { x: midX, y: fs.y },
      { x: midX, y: ts.y },
      ts,
      t,
    ]);
  }
  // Both vertical — horizontal mid-line.
  if (!fHoriz && !tHoriz) {
    const midY = pickClearMidY((fs.y + ts.y) / 2, fs.x, ts.x, obstacles);
    return uniqPath([
      f,
      fs,
      { x: fs.x, y: midY },
      { x: ts.x, y: midY },
      ts,
      t,
    ]);
  }
  // Mixed — single L-shape elbow.
  if (fHoriz) {
    return uniqPath([
      f,
      fs,
      { x: ts.x, y: fs.y },
      ts,
      t,
    ]);
  }
  return uniqPath([
    f,
    fs,
    { x: fs.x, y: ts.y },
    ts,
    t,
  ]);
}

/**
 * Pick a vertical mid-line X that doesn't fall inside any obstacle whose
 * Y range overlaps the path's Y span. If the ideal midX is clear, return
 * it; otherwise shift to either side of the offending obstacle, whichever
 * is closer to the ideal.
 */
function pickClearMidX(idealX: number, y1: number, y2: number, obstacles: Rect[]): number {
  if (obstacles.length === 0) return idealX;
  const yMin = Math.min(y1, y2);
  const yMax = Math.max(y1, y2);
  let midX = idealX;
  for (let i = 0; i < 4; i++) { // a few passes in case shifting puts us in another obstacle
    let shifted = false;
    for (const ob of obstacles) {
      // Skip obstacles outside the path's Y span
      if (ob.y + ob.height + DODGE_PADDING < yMin) continue;
      if (ob.y - DODGE_PADDING > yMax) continue;
      const left = ob.x - DODGE_PADDING;
      const right = ob.x + ob.width + DODGE_PADDING;
      if (midX > left && midX < right) {
        midX = Math.abs(midX - left) <= Math.abs(midX - right) ? left - 1 : right + 1;
        shifted = true;
      }
    }
    if (!shifted) break;
  }
  return midX;
}

function pickClearMidY(idealY: number, x1: number, x2: number, obstacles: Rect[]): number {
  if (obstacles.length === 0) return idealY;
  const xMin = Math.min(x1, x2);
  const xMax = Math.max(x1, x2);
  let midY = idealY;
  for (let i = 0; i < 4; i++) {
    let shifted = false;
    for (const ob of obstacles) {
      if (ob.x + ob.width + DODGE_PADDING < xMin) continue;
      if (ob.x - DODGE_PADDING > xMax) continue;
      const top = ob.y - DODGE_PADDING;
      const bot = ob.y + ob.height + DODGE_PADDING;
      if (midY > top && midY < bot) {
        midY = Math.abs(midY - top) <= Math.abs(midY - bot) ? top - 1 : bot + 1;
        shifted = true;
      }
    }
    if (!shifted) break;
  }
  return midY;
}

function uniqPath(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.5 || Math.abs(last.y - p.y) > 0.5) {
      out.push(p);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Obstacle dodge                                                      */
/* ------------------------------------------------------------------ */

/**
 * Walk each segment in `path`. When a segment crosses any rect in
 * `obstacles` (with `padding`), insert a detour around the rect.
 *
 * Iteratively re-checks until no segment crosses any obstacle, or a
 * cap is hit (rare cases where iteration would oscillate).
 */
export function dodgeObstacles(
  path: Point[],
  obstacles: Rect[],
  padding = DODGE_PADDING
): Point[] {
  if (obstacles.length === 0 || path.length < 2) return path;

  let working = path.slice();
  for (let iter = 0; iter < MAX_DODGE_ITERATIONS; iter++) {
    let dodged = false;
    const result: Point[] = [working[0]];
    for (let i = 1; i < working.length; i++) {
      const a = result[result.length - 1];
      const b = working[i];
      const detour = detourAround(a, b, obstacles, padding);
      if (detour.length === 0) {
        result.push(b);
      } else {
        for (const p of detour) result.push(p);
        result.push(b);
        dodged = true;
      }
    }
    working = uniqPath(result);
    if (!dodged) break;
  }
  return working;
}

/**
 * If segment a→b (axis-aligned) crosses any obstacle, return ≥1 detour
 * waypoints to route AROUND the closest crossing one. Detour preserves
 * the Manhattan property by inserting two right-angle waypoints.
 *
 * Returns an empty array if the segment is clean.
 */
function detourAround(a: Point, b: Point, obstacles: Rect[], padding: number): Point[] {
  const isHorizontal = Math.abs(a.y - b.y) < 0.5;
  const isVertical = Math.abs(a.x - b.x) < 0.5;
  if (!isHorizontal && !isVertical) return [];

  // Find the obstacle that's closest to `a` along the segment direction.
  let best: { rect: Rect; entry: number; exit: number } | null = null;
  for (const r of obstacles) {
    const expanded = expandRect(r, padding);
    if (!segmentCrossesRect(a, b, expanded)) continue;

    let entry: number, exit: number;
    if (isHorizontal) {
      entry = b.x > a.x ? expanded.x : expanded.x + expanded.width;
      exit = b.x > a.x ? expanded.x + expanded.width : expanded.x;
    } else {
      entry = b.y > a.y ? expanded.y : expanded.y + expanded.height;
      exit = b.y > a.y ? expanded.y + expanded.height : expanded.y;
    }
    const dist = isHorizontal ? Math.abs(entry - a.x) : Math.abs(entry - a.y);
    if (!best || dist < (isHorizontal ? Math.abs(best.entry - a.x) : Math.abs(best.entry - a.y))) {
      best = { rect: expanded, entry, exit };
    }
  }
  if (!best) return [];

  // Detour around — pick the side of the obstacle nearest to the segment.
  if (isHorizontal) {
    // Segment runs along Y = a.y. Detour above (smaller Y) or below (larger Y)?
    const aboveY = best.rect.y - 1;
    const belowY = best.rect.y + best.rect.height + 1;
    const detourY = Math.abs(a.y - aboveY) <= Math.abs(a.y - belowY) ? aboveY : belowY;
    return [
      { x: best.entry, y: a.y },
      { x: best.entry, y: detourY },
      { x: best.exit, y: detourY },
      { x: best.exit, y: a.y },
    ];
  } else {
    const leftX = best.rect.x - 1;
    const rightX = best.rect.x + best.rect.width + 1;
    const detourX = Math.abs(a.x - leftX) <= Math.abs(a.x - rightX) ? leftX : rightX;
    return [
      { x: a.x, y: best.entry },
      { x: detourX, y: best.entry },
      { x: detourX, y: best.exit },
      { x: a.x, y: best.exit },
    ];
  }
}

function expandRect(r: Rect, padding: number): Rect {
  return {
    x: r.x - padding,
    y: r.y - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
  };
}

/** True if the axis-aligned segment a→b passes through `rect`. */
function segmentCrossesRect(a: Point, b: Point, rect: Rect): boolean {
  const xMin = Math.min(a.x, b.x);
  const xMax = Math.max(a.x, b.x);
  const yMin = Math.min(a.y, b.y);
  const yMax = Math.max(a.y, b.y);
  if (xMax < rect.x) return false;
  if (xMin > rect.x + rect.width) return false;
  if (yMax < rect.y) return false;
  if (yMin > rect.y + rect.height) return false;
  // Segment endpoints WITHIN rect are not "crossing" — a line ending on a
  // node's side anchor lands on the boundary which is ok.
  if (a.x >= rect.x + 1 && a.x <= rect.x + rect.width - 1 && a.y >= rect.y + 1 && a.y <= rect.y + rect.height - 1) return false;
  if (b.x >= rect.x + 1 && b.x <= rect.x + rect.width - 1 && b.y >= rect.y + 1 && b.y <= rect.y + rect.height - 1) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* SVG `d` builders                                                    */
/* ------------------------------------------------------------------ */

/** Convert a polyline to an SVG path with optionally rounded corners. */
export function pathFromPoints(points: Point[], cornerRadius = 8): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2 || cornerRadius <= 0) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const r = Math.min(
      cornerRadius,
      distance(prev, curr) / 2,
      distance(curr, next) / 2,
    );
    if (r < 1) {
      d += ` L${curr.x},${curr.y}`;
      continue;
    }
    const beforeX = curr.x + Math.sign(prev.x - curr.x) * r;
    const beforeY = curr.y + Math.sign(prev.y - curr.y) * r;
    const afterX = curr.x + Math.sign(next.x - curr.x) * r;
    const afterY = curr.y + Math.sign(next.y - curr.y) * r;
    d += ` L${beforeX},${beforeY} Q${curr.x},${curr.y} ${afterX},${afterY}`;
  }
  const last = points[points.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** A simple bezier between two anchors that stubs perpendicular to each
 *  side. Useful when consumers ask for `routing="bezier"`. */
export function bezierPath(from: Anchor, to: Anchor): string {
  const fs = stubOut(from, Math.max(40, distance(from, to) * 0.3));
  const ts = stubOut(to, Math.max(40, distance(from, to) * 0.3));
  return `M${from.x},${from.y} C${fs.x},${fs.y} ${ts.x},${ts.y} ${to.x},${to.y}`;
}

/** A point along the polyline at fractional position 0..1 (for label placement). */
export function midPoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  // Total length
  let total = 0;
  const segLens: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const len = distance(points[i - 1], points[i]);
    segLens.push(len);
    total += len;
  }
  let target = total / 2;
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i]) {
      const t = segLens[i] === 0 ? 0 : target / segLens[i];
      const a = points[i];
      const b = points[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    target -= segLens[i];
  }
  return points[points.length - 1];
}

/** Inset a path's first/last segment by `inset` units so a marker can sit
 *  at the original endpoint without overlapping the line. */
export function insetEndpoints(points: Point[], inset: { from: number; to: number }): Point[] {
  if (points.length < 2) return points;
  const result = points.slice();
  // Front
  if (inset.from > 0) {
    const a = result[0];
    const b = result[1];
    const len = distance(a, b);
    if (len > inset.from) {
      const t = inset.from / len;
      result[0] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  // Back
  if (inset.to > 0) {
    const lastIdx = result.length - 1;
    const a = result[lastIdx];
    const b = result[lastIdx - 1];
    const len = distance(a, b);
    if (len > inset.to) {
      const t = inset.to / len;
      result[lastIdx] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return result;
}
