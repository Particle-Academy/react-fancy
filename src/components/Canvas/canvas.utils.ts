import type { NodeRect } from "../../hooks/use-node-registry";
import type { EdgeAnchor } from "./Canvas.types";

export interface Point {
  x: number;
  y: number;
}

export function getAnchorPoint(rect: NodeRect, anchor: EdgeAnchor, otherRect?: NodeRect): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  if (anchor === "auto" && otherRect) {
    const ocx = otherRect.x + otherRect.width / 2;
    const ocy = otherRect.y + otherRect.height / 2;
    const dx = ocx - cx;
    const dy = ocy - cy;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0
        ? { x: rect.x + rect.width, y: cy }
        : { x: rect.x, y: cy };
    }
    return dy > 0
      ? { x: cx, y: rect.y + rect.height }
      : { x: cx, y: rect.y };
  }

  switch (anchor) {
    case "top": return { x: cx, y: rect.y };
    case "bottom": return { x: cx, y: rect.y + rect.height };
    case "left": return { x: rect.x, y: cy };
    case "right": return { x: rect.x + rect.width, y: cy };
    case "center": return { x: cx, y: cy };
    default: return { x: cx, y: cy };
  }
}

export function bezierPath(from: Point, to: Point): string {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);

  // Determine if the connection is more horizontal or vertical
  if (dx > dy) {
    // Horizontal: control points extend horizontally
    const offset = dx * 0.5;
    const cp1x = from.x + (to.x > from.x ? offset : -offset);
    const cp2x = to.x + (to.x > from.x ? -offset : offset);
    return `M${from.x},${from.y} C${cp1x},${from.y} ${cp2x},${to.y} ${to.x},${to.y}`;
  }
  // Vertical: control points extend vertically
  const offset = Math.max(dy * 0.5, 30);
  const cp1y = from.y + (to.y > from.y ? offset : -offset);
  const cp2y = to.y + (to.y > from.y ? -offset : offset);
  return `M${from.x},${from.y} C${from.x},${cp1y} ${to.x},${cp2y} ${to.x},${to.y}`;
}

export function stepPath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  return `M${from.x},${from.y} H${midX} V${to.y} H${to.x}`;
}

export function straightPath(from: Point, to: Point): string {
  return `M${from.x},${from.y} L${to.x},${to.y}`;
}

export function getEdgePath(
  from: Point,
  to: Point,
  curve: "bezier" | "step" | "straight" = "bezier",
): string {
  switch (curve) {
    case "bezier": return bezierPath(from, to);
    case "step": return stepPath(from, to);
    case "straight": return straightPath(from, to);
  }
}
