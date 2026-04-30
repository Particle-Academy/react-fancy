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
  /** Grid spacing in canvas-space pixels (unaffected by zoom). */
  gridSize: number;
  /** When true, dragged nodes snap their top-left corner to the grid. */
  snapToGrid: boolean;
}

export type GridStyle = "dots" | "lines" | "none";

export interface CanvasProps {
  children: ReactNode;
  viewport?: ViewportState;
  defaultViewport?: ViewportState;
  onViewportChange?: (viewport: ViewportState) => void;
  minZoom?: number;
  maxZoom?: number;
  pannable?: boolean;
  zoomable?: boolean;
  /** Grid spacing in canvas-space pixels. Defaults to 20. */
  gridSize?: number;
  /** Show/hide the canvas grid. Defaults to false. */
  showGrid?: boolean;
  /** Grid pattern when shown — dots (default), lines, or none. Setting this
   *  to "none" hides the grid even when `showGrid` is true. */
  gridStyle?: GridStyle;
  /** Grid color (any CSS color). Defaults to a faint zinc. */
  gridColor?: string;
  /** Snap dragged nodes to the grid. Defaults to false. */
  snapToGrid?: boolean;
  /** Automatically fit all nodes into view on initial mount */
  fitOnMount?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface CanvasNodeProps {
  children: ReactNode;
  id: string;
  x: number;
  y: number;
  /** Allow drag-to-move */
  draggable?: boolean;
  /** Called when the node is dragged to a new position */
  onPositionChange?: (x: number, y: number) => void;
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
