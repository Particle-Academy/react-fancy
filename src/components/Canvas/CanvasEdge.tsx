import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { useCanvas } from "./Canvas.context";
import { getAnchorPoint, getEdgePath } from "./canvas.utils";
import type { CanvasEdgeProps } from "./Canvas.types";

export function CanvasEdge({
  from,
  to,
  fromAnchor = "auto",
  toAnchor = "auto",
  curve = "bezier",
  color = "currentColor",
  strokeWidth = 2,
  dashed = false,
  animated = false,
  label,
  className,
  markerStart,
  markerEnd,
}: CanvasEdgeProps) {
  const { nodeRects, registryVersion } = useCanvas();

  const path = useMemo(() => {
    const fromRect = nodeRects.get(from);
    const toRect = nodeRects.get(to);
    if (!fromRect || !toRect) return null;

    const fromPt = getAnchorPoint(fromRect, fromAnchor, toRect);
    const toPt = getAnchorPoint(toRect, toAnchor, fromRect);
    return {
      d: getEdgePath(fromPt, toPt, curve),
      midX: (fromPt.x + toPt.x) / 2,
      midY: (fromPt.y + toPt.y) / 2,
    };
  }, [from, to, fromAnchor, toAnchor, curve, nodeRects, registryVersion]);

  if (!path) return null;

  return (
    <g data-react-fancy-canvas-edge="" className={cn("text-zinc-300 dark:text-zinc-600", className)}>
      <path
        d={path.d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "6 4" : undefined}
        markerStart={markerStart ? `url(#${markerStart})` : undefined}
        markerEnd={markerEnd ? `url(#${markerEnd})` : undefined}
        className={animated ? "animate-[dash_1s_linear_infinite]" : ""}
        style={animated ? { strokeDasharray: "8 4" } : undefined}
      />
      {label && (
        <foreignObject x={path.midX - 40} y={path.midY - 12} width={80} height={24}>
          <div className="flex items-center justify-center text-xs text-zinc-500">{label}</div>
        </foreignObject>
      )}
    </g>
  );
}

CanvasEdge.displayName = "CanvasEdge";
