import { useEffect, useRef, useCallback } from "react";
import { cn } from "../../utils/cn";
import { useCanvas } from "./Canvas.context";
import type { CanvasNodeProps } from "./Canvas.types";

export function CanvasNode({ children, id, x, y, draggable, onPositionChange, className, style }: CanvasNodeProps) {
  const { registerNode, unregisterNode, viewport, gridSize, snapToGrid } = useCanvas();
  const nodeRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });

  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;

    const updateRect = () => {
      registerNode(id, { x, y, width: el.offsetWidth, height: el.offsetHeight });
    };

    updateRect();

    const observer = new ResizeObserver(updateRect);
    observer.observe(el);

    return () => {
      observer.disconnect();
      unregisterNode(id);
    };
  }, [id, x, y, registerNode, unregisterNode]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable || e.button !== 0) return;
      e.stopPropagation();
      isDragging.current = true;
      dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, nodeX: x, nodeY: y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [draggable, x, y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = (e.clientX - dragStart.current.mouseX) / viewport.zoom;
      const dy = (e.clientY - dragStart.current.mouseY) / viewport.zoom;
      let nx = dragStart.current.nodeX + dx;
      let ny = dragStart.current.nodeY + dy;
      if (snapToGrid && gridSize > 0) {
        nx = Math.round(nx / gridSize) * gridSize;
        ny = Math.round(ny / gridSize) * gridSize;
      }
      onPositionChange?.(nx, ny);
    },
    [viewport.zoom, onPositionChange, snapToGrid, gridSize],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={nodeRef}
      data-react-fancy-canvas-node=""
      data-node-id={id}
      className={cn("absolute", draggable && "cursor-grab active:cursor-grabbing", className)}
      style={{ left: x, top: y, ...style }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
    </div>
  );
}

CanvasNode.displayName = "CanvasNode";
