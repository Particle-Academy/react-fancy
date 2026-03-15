import { useMemo, useRef, Children, type ReactElement } from "react";
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
    () => ({ viewport, setViewport, registerNode, unregisterNode, nodeRects, registryVersion, containerRef }),
    [viewport, setViewport, registerNode, unregisterNode, nodeRects, registryVersion],
  );

  // Separate edge children from node/other children
  const edges: ReactElement[] = [];
  const others: ReactElement[] = [];
  const overlays: ReactElement[] = []; // minimap, controls

  Children.forEach(children, (child) => {
    const el = child as ReactElement;
    if (!el || !el.type) return;
    if (el.type === CanvasEdge) {
      edges.push(el);
    } else if (el.type === CanvasMinimap || el.type === CanvasControls) {
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
          style={showGrid ? {
            backgroundImage: `radial-gradient(circle, rgb(161 161 170 / 0.3) 1px, transparent 1px)`,
            backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
            backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
          } : undefined}
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
            <marker id="canvas-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill="currentColor" className="text-zinc-400 dark:text-zinc-500" />
            </marker>
            <marker id="canvas-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <circle cx="5" cy="5" r="3.5" fill="currentColor" className="text-zinc-400 dark:text-zinc-500" />
            </marker>
            <marker id="canvas-square" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <rect x="1.5" y="1.5" width="7" height="7" fill="currentColor" className="text-zinc-400 dark:text-zinc-500" />
            </marker>
            <marker id="canvas-crow-foot" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
              <line x1="0" y1="0" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400 dark:text-zinc-500" />
              <line x1="0" y1="12" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400 dark:text-zinc-500" />
              <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400 dark:text-zinc-500" />
            </marker>
            <marker id="canvas-diamond" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
              <polygon points="6,0 12,6 6,12 0,6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400 dark:text-zinc-500" />
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
