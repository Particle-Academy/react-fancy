/**
 * Endpoint marker rendering for DiagramRelation.
 *
 * Each marker is rendered as one or more SVG `<path>` strings (and optionally
 * a `<text>` for emoji markers) anchored to the endpoint of the line. We
 * avoid SVG `<defs><marker>` elements because relations are scattered into a
 * shared Canvas SVG layer and per-relation defs would either collide or
 * require a singleton parent.
 */
import type { LineStyle, MarkerType, RelationType } from "./Diagram.types";

export type Direction = "left" | "right" | "up" | "down";

export interface Point {
  x: number;
  y: number;
}

export interface MarkerRenderable {
  /** SVG `<path>` `d` attributes that draw the marker. */
  paths: { d: string; fill?: "stroke" | "none" | "background" }[];
  /** Optional emoji/text to draw at the endpoint. */
  text?: string;
}

/** Default marker presets per RelationType. Consumer-supplied
 *  `fromMarker` / `toMarker` always win. */
export function defaultMarkersForType(type: RelationType | undefined): {
  fromMarker: MarkerType;
  toMarker: MarkerType;
  lineStyle: LineStyle;
} {
  switch (type) {
    case "one-to-one":
      return { fromMarker: "one", toMarker: "one", lineStyle: "solid" };
    case "one-to-many":
      return { fromMarker: "one", toMarker: "many", lineStyle: "solid" };
    case "many-to-one":
      return { fromMarker: "many", toMarker: "one", lineStyle: "solid" };
    case "many-to-many":
      return { fromMarker: "many", toMarker: "many", lineStyle: "solid" };
    case "association":
      return { fromMarker: "none", toMarker: "arrow", lineStyle: "solid" };
    case "aggregation":
      return { fromMarker: "diamond-open", toMarker: "none", lineStyle: "solid" };
    case "composition":
      return { fromMarker: "diamond", toMarker: "none", lineStyle: "solid" };
    case "inheritance":
      return { fromMarker: "none", toMarker: "triangle-open", lineStyle: "solid" };
    case "implementation":
      return { fromMarker: "none", toMarker: "triangle-open", lineStyle: "dashed" };
    case "dependency":
      return { fromMarker: "none", toMarker: "arrow", lineStyle: "dashed" };
    default:
      return { fromMarker: "none", toMarker: "none", lineStyle: "solid" };
  }
}

const SIZE = 12; // base marker extent

/**
 * Render a marker. The point passed in is the visible LINE endpoint; the
 * marker is drawn extending from there along `direction`. The line should
 * stop at the same point so the marker sits flush.
 */
export function renderMarker(
  marker: MarkerType,
  pt: Point,
  direction: Direction
): MarkerRenderable | null {
  // Emoji passthrough — `emoji:🎯` or any single emoji string
  if (typeof marker === "string" && marker.startsWith("emoji:")) {
    return { paths: [], text: marker.slice(6) };
  }

  switch (marker) {
    case "none":
      return null;

    case "arrow":
      return { paths: [{ d: arrowPath(pt, direction, true), fill: "stroke" }] };
    case "arrow-open":
      return { paths: [{ d: arrowPath(pt, direction, false), fill: "none" }] };

    case "circle":
      return { paths: [{ d: circlePath(pt, true), fill: "stroke" }] };
    case "circle-open":
      return { paths: [{ d: circlePath(pt, false), fill: "background" }] };

    case "square":
      return { paths: [{ d: squarePath(pt, direction, true), fill: "stroke" }] };
    case "square-open":
      return { paths: [{ d: squarePath(pt, direction, false), fill: "background" }] };

    case "diamond":
      return { paths: [{ d: diamondPath(pt, direction, true), fill: "stroke" }] };
    case "diamond-open":
      return { paths: [{ d: diamondPath(pt, direction, false), fill: "background" }] };

    case "triangle":
      return { paths: [{ d: trianglePath(pt, direction, true), fill: "stroke" }] };
    case "triangle-open":
      return { paths: [{ d: trianglePath(pt, direction, false), fill: "background" }] };

    case "cross":
      return { paths: [{ d: crossPath(pt, direction), fill: "none" }] };

    case "one":
      return { paths: [{ d: oneSymbol(pt, direction), fill: "none" }] };
    case "many":
      return { paths: [{ d: crowFootSymbol(pt, direction), fill: "none" }] };
    case "optional-one":
      return {
        paths: [
          { d: circleOuter(pt, direction), fill: "background" },
          { d: oneSymbolOffset(pt, direction), fill: "none" },
        ],
      };
    case "optional-many":
      return {
        paths: [
          { d: circleOuter(pt, direction), fill: "background" },
          { d: crowFootSymbolOffset(pt, direction), fill: "none" },
        ],
      };

    default:
      // Unknown string with no `emoji:` prefix — treat as raw text/emoji
      if (typeof marker === "string" && marker !== "") {
        return { paths: [], text: marker };
      }
      return null;
  }
}

/** How far a marker extends from the line endpoint along the direction.
 *  Used to inset the line endpoint so the marker sits flush. */
export function markerInset(marker: MarkerType): number {
  if (marker === "none" || marker === undefined) return 0;
  if (typeof marker === "string" && (marker.startsWith("emoji:") || !KNOWN_MARKERS.has(marker))) {
    return SIZE; // emoji: leave space
  }
  switch (marker) {
    case "circle":
    case "circle-open":
      return SIZE * 0.6;
    case "one":
      return 0; // bar sits AT endpoint
    case "many":
      return SIZE;
    case "optional-one":
      return SIZE * 1.2;
    case "optional-many":
      return SIZE * 1.8;
    default:
      return SIZE;
  }
}

const KNOWN_MARKERS = new Set([
  "none", "arrow", "arrow-open", "circle", "circle-open",
  "square", "square-open", "diamond", "diamond-open",
  "triangle", "triangle-open", "one", "many",
  "optional-one", "optional-many", "cross",
]);

/* ------------------------------------------------------------------ */
/* Shape path generators                                               */
/* ------------------------------------------------------------------ */

function dirVec(direction: Direction): [number, number] {
  switch (direction) {
    case "left": return [-1, 0];
    case "right": return [1, 0];
    case "up": return [0, -1];
    case "down": return [0, 1];
  }
}

function perpVec(direction: Direction): [number, number] {
  switch (direction) {
    case "left":
    case "right": return [0, 1];
    case "up":
    case "down": return [1, 0];
  }
}

function arrowPath(pt: Point, direction: Direction, _filled: boolean): string {
  // Triangle with apex at pt + direction*size, base at pt
  const [dx, dy] = dirVec(direction);
  const [px, py] = perpVec(direction);
  const tipX = pt.x + dx * SIZE;
  const tipY = pt.y + dy * SIZE;
  const baseAX = pt.x + px * (SIZE * 0.55);
  const baseAY = pt.y + py * (SIZE * 0.55);
  const baseBX = pt.x - px * (SIZE * 0.55);
  const baseBY = pt.y - py * (SIZE * 0.55);
  return `M${baseAX},${baseAY} L${tipX},${tipY} L${baseBX},${baseBY} Z`;
}

function circlePath(pt: Point, _filled: boolean): string {
  // Small circle centered at the endpoint
  const r = SIZE * 0.45;
  return `M${pt.x - r},${pt.y} a${r},${r} 0 1 0 ${r * 2},0 a${r},${r} 0 1 0 ${-r * 2},0 Z`;
}

function squarePath(pt: Point, direction: Direction, _filled: boolean): string {
  const [dx, dy] = dirVec(direction);
  const [px, py] = perpVec(direction);
  const half = SIZE * 0.5;
  // square centered along the direction starting at pt
  const cx = pt.x + dx * half;
  const cy = pt.y + dy * half;
  const tlX = cx - px * half - dx * half;
  const tlY = cy - py * half - dy * half;
  const trX = cx + px * half - dx * half;
  const trY = cy + py * half - dy * half;
  const brX = cx + px * half + dx * half;
  const brY = cy + py * half + dy * half;
  const blX = cx - px * half + dx * half;
  const blY = cy - py * half + dy * half;
  return `M${tlX},${tlY} L${trX},${trY} L${brX},${brY} L${blX},${blY} Z`;
}

function diamondPath(pt: Point, direction: Direction, _filled: boolean): string {
  // Diamond: 4 points along ±direction and ±perp from a center between pt and tip
  const [dx, dy] = dirVec(direction);
  const [px, py] = perpVec(direction);
  const len = SIZE * 1.2;
  const cx = pt.x + dx * (len / 2);
  const cy = pt.y + dy * (len / 2);
  const aX = pt.x;
  const aY = pt.y;
  const bX = cx + px * (SIZE * 0.45);
  const bY = cy + py * (SIZE * 0.45);
  const tX = pt.x + dx * len;
  const tY = pt.y + dy * len;
  const dX = cx - px * (SIZE * 0.45);
  const dY = cy - py * (SIZE * 0.45);
  return `M${aX},${aY} L${bX},${bY} L${tX},${tY} L${dX},${dY} Z`;
}

function trianglePath(pt: Point, direction: Direction, _filled: boolean): string {
  // Triangle with base at pt + dir*size and apex at pt — typical UML inheritance
  const [dx, dy] = dirVec(direction);
  const [px, py] = perpVec(direction);
  const len = SIZE * 1.1;
  const baseCX = pt.x + dx * len;
  const baseCY = pt.y + dy * len;
  const baseAX = baseCX + px * (SIZE * 0.6);
  const baseAY = baseCY + py * (SIZE * 0.6);
  const baseBX = baseCX - px * (SIZE * 0.6);
  const baseBY = baseCY - py * (SIZE * 0.6);
  return `M${pt.x},${pt.y} L${baseAX},${baseAY} L${baseBX},${baseBY} Z`;
}

function crossPath(pt: Point, direction: Direction): string {
  const [dx, dy] = dirVec(direction);
  const [px, py] = perpVec(direction);
  const s = SIZE * 0.5;
  // Center of the X is one half-size out from the endpoint along direction
  const cx = pt.x + dx * (SIZE * 0.5);
  const cy = pt.y + dy * (SIZE * 0.5);
  return [
    `M${cx - s * (px + dx)},${cy - s * (py + dy)} L${cx + s * (px + dx)},${cy + s * (py + dy)}`,
    `M${cx - s * (px - dx)},${cy - s * (py - dy)} L${cx + s * (px - dx)},${cy + s * (py - dy)}`,
  ].join(" ");
}

function oneSymbol(pt: Point, direction: Direction): string {
  const [, py] = perpVec(direction);
  const [px] = perpVec(direction);
  const half = SIZE * 0.6;
  return `M${pt.x - px * half},${pt.y - py * half} L${pt.x + px * half},${pt.y + py * half}`;
}

function crowFootSymbol(pt: Point, direction: Direction): string {
  const [dx, dy] = dirVec(direction);
  const [px, py] = perpVec(direction);
  // Tip is OUTWARD from the endpoint (away from entity)
  const tipX = pt.x + dx * SIZE;
  const tipY = pt.y + dy * SIZE;
  const spread = SIZE * 0.8;
  const aX = pt.x + px * spread, aY = pt.y + py * spread;
  const cX = pt.x - px * spread, cY = pt.y - py * spread;
  return [
    `M${aX},${aY} L${tipX},${tipY}`,
    `M${pt.x},${pt.y} L${tipX},${tipY}`,
    `M${cX},${cY} L${tipX},${tipY}`,
    `M${aX},${aY} L${cX},${cY}`,
  ].join(" ");
}

function circleOuter(pt: Point, direction: Direction): string {
  // Small circle sitting OUTSIDE the entity — used for "optional" indicators
  const [dx, dy] = dirVec(direction);
  const r = SIZE * 0.4;
  const cx = pt.x + dx * (SIZE * 0.4 + r);
  const cy = pt.y + dy * (SIZE * 0.4 + r);
  return `M${cx - r},${cy} a${r},${r} 0 1 0 ${r * 2},0 a${r},${r} 0 1 0 ${-r * 2},0 Z`;
}

function oneSymbolOffset(pt: Point, direction: Direction): string {
  // Bar sits between the entity edge and the optional circle
  const [px, py] = perpVec(direction);
  const half = SIZE * 0.6;
  return `M${pt.x - px * half},${pt.y - py * half} L${pt.x + px * half},${pt.y + py * half}`;
}

function crowFootSymbolOffset(pt: Point, direction: Direction): string {
  // Crow's foot extending past the optional circle
  const [dx, dy] = dirVec(direction);
  const [px, py] = perpVec(direction);
  const inset = SIZE * 0.8;
  const startX = pt.x + dx * inset;
  const startY = pt.y + dy * inset;
  const tipX = pt.x + dx * (inset + SIZE);
  const tipY = pt.y + dy * (inset + SIZE);
  const spread = SIZE * 0.8;
  const aX = startX + px * spread, aY = startY + py * spread;
  const cX = startX - px * spread, cY = startY - py * spread;
  return [
    `M${aX},${aY} L${tipX},${tipY}`,
    `M${startX},${startY} L${tipX},${tipY}`,
    `M${cX},${cY} L${tipX},${tipY}`,
  ].join(" ");
}
