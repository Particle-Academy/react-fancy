import { useMemo } from "react";
import { useCanvas } from "../Canvas/Canvas.context";
import type { DiagramRelationProps } from "./Diagram.types";
import { useDiagram } from "./Diagram.context";
import {
  defaultMarkersForType,
  markerInset,
  renderMarker,
  type Direction,
  type Point,
} from "./diagram.markers";
import {
  bezierPath,
  dodgeObstacles,
  insetEndpoints,
  manhattanPath,
  midPoint,
  pathFromPoints,
  pickAnchors,
  type Anchor,
  type Rect,
} from "./diagram.routing";

const HEADER_HEIGHT = 36;
const FIELD_HEIGHT = 29; // 28px content (py-1 + text-sm) + 1px border-t
const DEFAULT_COLOR = "#71717a";

/** Direction the marker shape "points into the entity body" from the anchor.
 *  Marker helpers use this to position arrow tips inside the entity, ERD bars
 *  at the entity edge, and crow's-foot fingers fanning outward into the line. */
function markerDirection(side: Anchor["side"]): Direction {
  switch (side) {
    case "left": return "right";   // entity body is to the right of a left-side anchor
    case "right": return "left";
    case "top": return "down";
    case "bottom": return "up";
  }
}

function strokeDashArray(style: DiagramRelationProps["lineStyle"]): string | undefined {
  switch (style) {
    case "dashed": return "8 4";
    case "dotted": return "2 4";
    default: return undefined;
  }
}

export function DiagramRelation({
  from,
  to,
  fromField: fromFieldProp,
  toField: toFieldProp,
  type,
  fromMarker: fromMarkerProp,
  toMarker: toMarkerProp,
  lineStyle: lineStyleProp,
  routing = "manhattan",
  color = DEFAULT_COLOR,
  strokeWidth = 2,
  label,
}: DiagramRelationProps) {
  const { nodeRects, registryVersion } = useCanvas();
  const { schema } = useDiagram();

  const result = useMemo(() => {
    const fromRect = nodeRects.get(from);
    const toRect = nodeRects.get(to);
    if (!fromRect || !toRect) return null;

    const defaults = defaultMarkersForType(type);
    const fromMarker = fromMarkerProp ?? defaults.fromMarker;
    const toMarker = toMarkerProp ?? defaults.toMarker;
    const lineStyle = lineStyleProp ?? defaults.lineStyle;

    // Resolve field row Y for ERD-style "left/right" anchors.
    const fromEntity = schema.entities.find((e) => (e.id ?? e.name) === from);
    const toEntity = schema.entities.find((e) => (e.id ?? e.name) === to);
    const fromFieldY = resolveFieldY(fromRect, fromEntity?.fields, fromFieldProp, true);
    const toFieldY = resolveFieldY(toRect, toEntity?.fields, toFieldProp, false, fromEntity?.name ?? from);

    // Pick best (side, point) for each end.
    const anchors = pickAnchors(fromRect, toRect, fromFieldY, toFieldY);

    // For top/bottom anchors, ignore the field-Y heuristic — anchor at side midpoint.
    if (anchors.from.side === "top" || anchors.from.side === "bottom") {
      anchors.from.x = fromRect.x + fromRect.width / 2;
    }
    if (anchors.to.side === "top" || anchors.to.side === "bottom") {
      anchors.to.x = toRect.x + toRect.width / 2;
    }

    // Build the polyline.
    let points: Point[];
    if (routing === "straight") {
      points = [
        { x: anchors.from.x, y: anchors.from.y },
        { x: anchors.to.x, y: anchors.to.y },
      ];
    } else if (routing === "bezier") {
      // Bezier path is rendered separately as an SVG `d` string — handled below.
      points = [];
    } else {
      // Manhattan + obstacle-aware mid-line + post-pass dodge.
      const obstacles: Rect[] = [];
      nodeRects.forEach((rect, id) => {
        if (id === from || id === to) return;
        obstacles.push(rect);
      });
      const initial = manhattanPath(anchors.from, anchors.to, obstacles);
      points = dodgeObstacles(initial, obstacles);
    }

    // Inset endpoints so markers sit flush.
    const insetAmount = { from: markerInset(fromMarker), to: markerInset(toMarker) };
    if (routing !== "bezier") {
      points = insetEndpoints(points, insetAmount);
    }

    const linePath = routing === "bezier" ? bezierPath(anchors.from, anchors.to) : pathFromPoints(points);

    // Marker shapes.
    const fromMarkerRenderable = renderMarker(
      fromMarker,
      { x: anchors.from.x, y: anchors.from.y },
      markerDirection(anchors.from.side)
    );
    const toMarkerRenderable = renderMarker(
      toMarker,
      { x: anchors.to.x, y: anchors.to.y },
      markerDirection(anchors.to.side)
    );

    const mid = routing === "bezier"
      ? { x: (anchors.from.x + anchors.to.x) / 2, y: (anchors.from.y + anchors.to.y) / 2 }
      : midPoint(points);

    return {
      linePath,
      fromMarker: fromMarkerRenderable,
      toMarker: toMarkerRenderable,
      fromAnchor: anchors.from,
      toAnchor: anchors.to,
      mid,
      lineStyle,
    };
  }, [
    from,
    to,
    fromFieldProp,
    toFieldProp,
    type,
    fromMarkerProp,
    toMarkerProp,
    lineStyleProp,
    routing,
    schema,
    nodeRects,
    registryVersion,
  ]);

  if (!result) return null;

  const dashArray = strokeDashArray(result.lineStyle);

  return (
    <g data-react-fancy-diagram-relation="">
      <path
        d={result.linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {result.fromMarker?.paths.map((shape, i) => (
        <path
          key={`fm-${i}`}
          d={shape.d}
          fill={shape.fill === "stroke" ? color : shape.fill === "background" ? "#ffffff" : "none"}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {result.fromMarker?.text && (
        <text
          x={result.fromAnchor.x}
          y={result.fromAnchor.y}
          fontSize={16}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: "none" }}
        >
          {result.fromMarker.text}
        </text>
      )}
      {result.toMarker?.text && (
        <text
          x={result.toAnchor.x}
          y={result.toAnchor.y}
          fontSize={16}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: "none" }}
        >
          {result.toMarker.text}
        </text>
      )}
      {result.toMarker?.paths.map((shape, i) => (
        <path
          key={`tm-${i}`}
          d={shape.d}
          fill={shape.fill === "stroke" ? color : shape.fill === "background" ? "#ffffff" : "none"}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {label && (
        <foreignObject x={result.mid.x - 50} y={result.mid.y - 12} width={100} height={24}>
          <div className="flex items-center justify-center text-xs text-zinc-500">
            <span className="rounded bg-white/90 px-1.5 py-0.5 dark:bg-zinc-900/90">{label}</span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function resolveFieldY(
  rect: { width: number; height: number },
  fields: { name: string; primary?: boolean; foreign?: boolean }[] | undefined,
  fieldProp: string | undefined,
  isFrom: boolean,
  fromName?: string,
): number | undefined {
  if (!fields || fields.length === 0) return undefined;
  let idx = -1;
  if (fieldProp) {
    idx = fields.findIndex((f) => f.name === fieldProp);
  } else if (isFrom) {
    idx = fields.findIndex((f) => f.primary);
  } else {
    const lower = (fromName ?? "").toLowerCase();
    idx = fields.findIndex(
      (f) => f.foreign && (f.name === `${lower}_id` || f.name === `${lower}Id`)
    );
    if (idx === -1) idx = fields.findIndex((f) => f.foreign);
  }
  if (idx < 0) return undefined;
  return HEADER_HEIGHT + idx * FIELD_HEIGHT + FIELD_HEIGHT / 2;
}

// Mark as edge type so Canvas sorts it into the SVG layer
DiagramRelation._isCanvasEdge = true;
DiagramRelation.displayName = "DiagramRelation";
