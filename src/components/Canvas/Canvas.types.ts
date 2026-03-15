import type { ReactNode, CSSProperties } from "react";
import type { ViewportState } from "../../hooks/use-pan-zoom";
import type { NodeRect } from "../../hooks/use-node-registry";

export type { ViewportState } from "../../hooks/use-pan-zoom";

export type EdgeAnchor = "top" | "bottom" | "left" | "right" | "center" | "auto";

export interface CanvasContextValue {
  viewport: ViewportState;
  setViewport: (vp: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
  registerNode: (id: string, rect: NodeRect) => void;
  unregisterNode: (id: string) => void;
  nodeRects: Map<string, NodeRect>;
  registryVersion: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface CanvasProps {
  children: ReactNode;
  viewport?: ViewportState;
  defaultViewport?: ViewportState;
  onViewportChange?: (viewport: ViewportState) => void;
  minZoom?: number;
  maxZoom?: number;
  pannable?: boolean;
  zoomable?: boolean;
  gridSize?: number;
  showGrid?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface CanvasNodeProps {
  children: ReactNode;
  id: string;
  x: number;
  y: number;
  className?: string;
  style?: CSSProperties;
}

export interface CanvasEdgeProps {
  from: string;
  to: string;
  fromAnchor?: EdgeAnchor;
  toAnchor?: EdgeAnchor;
  curve?: "bezier" | "step" | "straight";
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
  animated?: boolean;
  label?: ReactNode;
  className?: string;
  markerStart?: string;
  markerEnd?: string;
}

export interface CanvasMinimapProps {
  width?: number;
  height?: number;
  className?: string;
}

export interface CanvasControlsProps {
  className?: string;
  showZoomIn?: boolean;
  showZoomOut?: boolean;
  showReset?: boolean;
  showFitAll?: boolean;
}
