import { useMemo } from "react";
import { useCanvas } from "../Canvas/Canvas.context";
import type { DiagramRelationProps } from "./Diagram.types";
import { useDiagram } from "./Diagram.context";

const HEADER_HEIGHT = 36;
const FIELD_HEIGHT = 29; // 28px content (py-1 + text-sm) + 1px border-t
const SYMBOL_SIZE = 12; // how far the ERD symbol extends from the entity edge

interface Point {
  x: number;
  y: number;
}

/**
 * Draw the "one" ERD symbol: a perpendicular bar at the attachment point.
 */
function oneSymbol(pt: Point, direction: "left" | "right" | "up" | "down"): string {
  const s = SYMBOL_SIZE * 0.6;
  switch (direction) {
    case "left":
    case "right":
      return `M${pt.x},${pt.y - s} L${pt.x},${pt.y + s}`;
    case "up":
    case "down":
      return `M${pt.x - s},${pt.y} L${pt.x + s},${pt.y}`;
  }
}

/**
 * Draw the "many" ERD crow's foot symbol: three lines fanning from the attachment point.
 */
function crowFootSymbol(pt: Point, direction: "left" | "right" | "up" | "down"): string {
  const s = SYMBOL_SIZE;
  const spread = s * 0.8;
  let tip: Point; // the point where lines converge (away from entity)
  switch (direction) {
    case "right": // entity is to the right, fan extends left
      tip = { x: pt.x - s, y: pt.y };
      return [
        `M${pt.x},${pt.y - spread} L${tip.x},${tip.y}`,
        `M${pt.x},${pt.y} L${tip.x},${tip.y}`,
        `M${pt.x},${pt.y + spread} L${tip.x},${tip.y}`,
        // bar at entity edge
        `M${pt.x},${pt.y - spread} L${pt.x},${pt.y + spread}`,
      ].join(" ");
    case "left": // entity is to the left, fan extends right
      tip = { x: pt.x + s, y: pt.y };
      return [
        `M${pt.x},${pt.y - spread} L${tip.x},${tip.y}`,
        `M${pt.x},${pt.y} L${tip.x},${tip.y}`,
        `M${pt.x},${pt.y + spread} L${tip.x},${tip.y}`,
        `M${pt.x},${pt.y - spread} L${pt.x},${pt.y + spread}`,
      ].join(" ");
    case "down": // entity is below, fan extends up
      tip = { x: pt.x, y: pt.y - s };
      return [
        `M${pt.x - spread},${pt.y} L${tip.x},${tip.y}`,
        `M${pt.x},${pt.y} L${tip.x},${tip.y}`,
        `M${pt.x + spread},${pt.y} L${tip.x},${tip.y}`,
        `M${pt.x - spread},${pt.y} L${pt.x + spread},${pt.y}`,
      ].join(" ");
    case "up": // entity is above, fan extends down
      tip = { x: pt.x, y: pt.y + s };
      return [
        `M${pt.x - spread},${pt.y} L${tip.x},${tip.y}`,
        `M${pt.x},${pt.y} L${tip.x},${tip.y}`,
        `M${pt.x + spread},${pt.y} L${tip.x},${tip.y}`,
        `M${pt.x - spread},${pt.y} L${pt.x + spread},${pt.y}`,
      ].join(" ");
  }
}

function getSymbolPath(
  type: DiagramRelationProps["type"],
  end: "start" | "end",
  pt: Point,
  direction: "left" | "right" | "up" | "down",
): string | null {
  const side = end === "start"
    ? type.split("-to-")[0] // "one" or "many"
    : type.split("-to-")[1]; // "one" or "many"
  if (side === "one") return oneSymbol(pt, direction);
  if (side === "many") return crowFootSymbol(pt, direction);
  return null;
}

export function DiagramRelation({
  from,
  to,
  fromField: fromFieldProp,
  toField: toFieldProp,
  type,
  label,
}: DiagramRelationProps) {
  const { nodeRects, registryVersion } = useCanvas();
  const { schema } = useDiagram();

  const result = useMemo(() => {
    const fromRect = nodeRects.get(from);
    const toRect = nodeRects.get(to);
    if (!fromRect || !toRect) return null;

    const fromEntity = schema.entities.find((e) => (e.id ?? e.name) === from);
    const toEntity = schema.entities.find((e) => (e.id ?? e.name) === to);

    // Resolve field indices for anchor Y offset
    let fromFieldIdx = -1;
    let toFieldIdx = -1;

    if (fromFieldProp && fromEntity?.fields) {
      fromFieldIdx = fromEntity.fields.findIndex((f) => f.name === fromFieldProp);
    } else if (fromEntity?.fields) {
      fromFieldIdx = fromEntity.fields.findIndex((f) => f.primary);
    }

    if (toFieldProp && toEntity?.fields) {
      toFieldIdx = toEntity.fields.findIndex((f) => f.name === toFieldProp);
    } else if (toEntity?.fields) {
      const fromName = (fromEntity?.name ?? from).toLowerCase();
      toFieldIdx = toEntity.fields.findIndex(
        (f) => f.foreign && (f.name === `${fromName}_id` || f.name === `${fromName}Id`),
      );
      if (toFieldIdx === -1) {
        toFieldIdx = toEntity.fields.findIndex((f) => f.foreign);
      }
    }

    const fromFieldY = fromFieldIdx >= 0
      ? HEADER_HEIGHT + fromFieldIdx * FIELD_HEIGHT + FIELD_HEIGHT / 2
      : fromRect.height / 2;
    const toFieldY = toFieldIdx >= 0
      ? HEADER_HEIGHT + toFieldIdx * FIELD_HEIGHT + FIELD_HEIGHT / 2
      : toRect.height / 2;

    // Always connect from entity sides at field-level Y (standard ERD convention).
    // This ensures connectors and crow's feet mount at the correct field rows
    // regardless of whether entities are arranged horizontally or vertically.
    const fromCx = fromRect.x + fromRect.width / 2;
    const toCx = toRect.x + toRect.width / 2;

    let fromPt: Point, toPt: Point;
    let fromDir: "left" | "right" | "up" | "down";
    let toDir: "left" | "right" | "up" | "down";

    if (fromCx <= toCx) {
      fromPt = { x: fromRect.x + fromRect.width, y: fromRect.y + fromFieldY };
      toPt = { x: toRect.x, y: toRect.y + toFieldY };
      fromDir = "right";
      toDir = "left";
    } else {
      fromPt = { x: fromRect.x, y: fromRect.y + fromFieldY };
      toPt = { x: toRect.x + toRect.width, y: toRect.y + toFieldY };
      fromDir = "left";
      toDir = "right";
    }

    // Offset endpoints outward by symbol size so symbols sit outside the entity
    const offsetFrom = { ...fromPt };
    const offsetTo = { ...toPt };
    if (fromDir === "right") offsetFrom.x += SYMBOL_SIZE;
    else offsetFrom.x -= SYMBOL_SIZE;
    if (toDir === "left") offsetTo.x -= SYMBOL_SIZE;
    else offsetTo.x += SYMBOL_SIZE;

    // Bezier curve with horizontal control points
    const adx = Math.abs(offsetTo.x - offsetFrom.x);
    const ady = Math.abs(offsetTo.y - offsetFrom.y);
    const off = Math.max(adx * 0.4, ady * 0.25, 40);
    const cp1x = offsetFrom.x + (fromDir === "right" ? off : -off);
    const cp2x = offsetTo.x + (toDir === "left" ? -off : off);
    const linePath = `M${offsetFrom.x},${offsetFrom.y} C${cp1x},${offsetFrom.y} ${cp2x},${offsetTo.y} ${offsetTo.x},${offsetTo.y}`;

    const startSymbol = getSymbolPath(type, "start", fromPt, fromDir);
    const endSymbol = getSymbolPath(type, "end", toPt, toDir);

    return { linePath, startSymbol, endSymbol, midX: (offsetFrom.x + offsetTo.x) / 2, midY: (offsetFrom.y + offsetTo.y) / 2 };
  }, [from, to, fromFieldProp, toFieldProp, type, schema, nodeRects, registryVersion]);

  if (!result) return null;

  return (
    <g data-react-fancy-diagram-relation="">
      {/* Connection line */}
      <path d={result.linePath} fill="none" stroke="#71717a" strokeWidth={2} />
      {/* ERD symbols at endpoints */}
      {result.startSymbol && <path d={result.startSymbol} fill="none" stroke="#71717a" strokeWidth={2} />}
      {result.endSymbol && <path d={result.endSymbol} fill="none" stroke="#71717a" strokeWidth={2} />}
      {label && (
        <foreignObject x={result.midX - 40} y={result.midY - 12} width={80} height={24}>
          <div className="flex items-center justify-center text-xs text-zinc-500">{label}</div>
        </foreignObject>
      )}
    </g>
  );
}

// Mark as edge type so Canvas sorts it into the SVG layer
DiagramRelation._isCanvasEdge = true;
DiagramRelation.displayName = "DiagramRelation";
