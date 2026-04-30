import { useMemo, useRef, useEffect, Children, type ReactElement } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { usePanZoom, type ViewportState } from "../../hooks/use-pan-zoom";
import { useNodeRegistry } from "../../hooks/use-node-registry";
import { CanvasContext } from "./Canvas.context";
import { CanvasNode } from "./CanvasNode";
import { CanvasEdge } from "./CanvasEdge";
import { CanvasMinimap } from "./CanvasMinimap";
import { CanvasControls } from "./CanvasControls";
import type { CanvasProps } from "./Canvas.types";

const DEFAULT_VIEWPORT: ViewportState = { panX: 0, panY: 0, zoom: 1 };

function CanvasRoot({
  children,
  viewport: controlledViewport,
  defaultViewport = DEFAULT_VIEWPORT,
  onViewportChange,
  minZoom = 0.1,
  maxZoom = 3,
  pannable = true,
  zoomable = true,
  showGrid = false,
  gridStyle = "dots",
  gridSize = 20,
  gridColor = "rgb(161 161 170 / 0.3)",
  snapToGrid = false,
  fitOnMount = false,
  className,
  style,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useControllableState(controlledViewport, defaultViewport, onViewportChange);
  const { registerNode, unregisterNode, nodeRects, version: registryVersion } = useNodeRegistry();

  const { containerProps } = usePanZoom({
    viewport,
    setViewport,
    minZoom,
    maxZoom,
    pannable,
    zoomable,
    containerRef,
  });

  const ctx = useMemo(
    () => ({ viewport, setViewport, registerNode, unregisterNode, nodeRects, registryVersion, containerRef, gridSize, snapToGrid }),
    [viewport, setViewport, registerNode, unregisterNode, nodeRects, registryVersion, gridSize, snapToGrid],
  );

  // Auto-fit all nodes into view on mount once nodes are registered
  const hasFitted = useRef(false);
  useEffect(() => {
    if (!fitOnMount || hasFitted.current || nodeRects.size === 0) return;
    const container = containerRef.current;
    if (!container || container.clientWidth === 0) return;

    hasFitted.current = true;

    // Use rAF to ensure layout is settled before measuring
    requestAnimationFrame(() => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodeRects.forEach((r) => {
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
      });

      const padding = 40;
      const contentW = maxX - minX + padding * 2;
      const contentH = maxY - minY + padding * 2;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const zoom = Math.min(cw / contentW, ch / contentH, 1.5);
      const panX = (cw - contentW * zoom) / 2 - minX * zoom + padding * zoom;
      const panY = (ch - contentH * zoom) / 2 - minY * zoom + padding * zoom;

      setViewport({ panX, panY, zoom });
    });
  }, [fitOnMount, nodeRects, registryVersion, setViewport]);

  // Separate edge children from node/other children
  const edges: ReactElement[] = [];
  const others: ReactElement[] = [];
  const overlays: ReactElement[] = []; // minimap, controls

  Children.forEach(children, (child) => {
    const el = child as ReactElement;
    if (!el || !el.type) return;
    const elType = el.type as any;
    if (elType === CanvasEdge || elType?._isCanvasEdge) {
      edges.push(el);
    } else if (elType === CanvasMinimap || elType === CanvasControls) {
      overlays.push(el);
    } else {
      others.push(el);
    }
  });

  return (
    <CanvasContext.Provider value={ctx}>
      <div
        ref={containerRef}
        data-react-fancy-canvas=""
        className={cn("relative overflow-hidden", className)}
        style={{ touchAction: "none", ...style }}
        {...containerProps}
      >
        {/* Background */}
        <div
          data-canvas-bg=""
          className="absolute inset-0"
          style={
            showGrid && gridStyle !== "none"
              ? gridStyle === "lines"
                ? {
                    backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
                    backgroundSize: `${gridSize * viewport.zoom}px ${gridSize * viewport.zoom}px`,
                    backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
                  }
                : {
                    backgroundImage: `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`,
                    backgroundSize: `${gridSize * viewport.zoom}px ${gridSize * viewport.zoom}px`,
                    backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
                  }
              : undefined
          }
        />

        {/* Transformed layer for nodes */}
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          }}
        >
          {others}
        </div>

        {/* SVG layer for edges */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{
            transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <defs>
            {/* Generic markers */}
            <marker id="canvas-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#71717a" />
            </marker>
            <marker id="canvas-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <circle cx="5" cy="5" r="3.5" fill="#71717a" />
            </marker>
            <marker id="canvas-diamond" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="10" markerHeight="10" orient="auto">
              <polygon points="6,0 12,6 6,12 0,6" fill="none" stroke="#71717a" strokeWidth="1.5" />
            </marker>

            {/* ERD: "one" perpendicular bar at path endpoint */}
            <marker id="canvas-one" viewBox="0 0 2 16" refX="1" refY="8" markerWidth="2" markerHeight="14" orient="auto">
              <line x1="1" y1="0" x2="1" y2="16" stroke="#71717a" strokeWidth="2" />
            </marker>

            {/* ERD: crow's foot at path endpoint — fork fans backward along the line */}
            {/* orient="auto" aligns x-axis with path direction at the endpoint.
                At markerEnd the path goes left→right into the entity.
                refX=16 places the rightmost edge at the endpoint (entity side).
                Fan lines go from right (x=16, entity) back-left into the line. */}
            <marker id="canvas-crow-foot" viewBox="0 0 16 16" refX="16" refY="8" markerWidth="14" markerHeight="14" orient="auto">
              <line x1="16" y1="8" x2="0" y2="0" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="8" x2="0" y2="8" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="8" x2="0" y2="16" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="0" x2="16" y2="16" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
            </marker>
          </defs>
          {edges}
        </svg>

        {/* Overlays (minimap, controls) sit outside the transform */}
        {overlays}
      </div>
    </CanvasContext.Provider>
  );
}

export const Canvas = Object.assign(CanvasRoot, {
  Node: CanvasNode,
  Edge: CanvasEdge,
  Minimap: CanvasMinimap,
  Controls: CanvasControls,
});
