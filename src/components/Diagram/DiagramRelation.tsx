import { cn } from "../../utils/cn";
import { Canvas } from "../Canvas/Canvas";
import type { DiagramRelationProps } from "./Diagram.types";

function getMarkers(type: DiagramRelationProps["type"]): {
  markerStart?: string;
  markerEnd?: string;
} {
  switch (type) {
    case "one-to-one":
      return { markerStart: "canvas-arrow", markerEnd: "canvas-arrow" };
    case "one-to-many":
      return { markerStart: "canvas-arrow", markerEnd: "canvas-crow-foot" };
    case "many-to-many":
      return { markerStart: "canvas-crow-foot", markerEnd: "canvas-crow-foot" };
  }
}

export function DiagramRelation({
  from,
  to,
  type,
  label,
  className,
}: DiagramRelationProps) {
  const markers = getMarkers(type);

  return (
    <Canvas.Edge
      from={from}
      to={to}
      curve="bezier"
      markerStart={markers.markerStart}
      markerEnd={markers.markerEnd}
      label={label}
      className={cn("text-zinc-300 dark:text-zinc-600", className)}
    />
  );
}

DiagramRelation.displayName = "DiagramRelation";
