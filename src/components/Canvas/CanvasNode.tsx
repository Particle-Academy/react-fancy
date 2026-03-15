import { useEffect, useRef } from "react";
import { cn } from "../../utils/cn";
import { useCanvas } from "./Canvas.context";
import type { CanvasNodeProps } from "./Canvas.types";

export function CanvasNode({ children, id, x, y, className, style }: CanvasNodeProps) {
  const { registerNode, unregisterNode } = useCanvas();
  const nodeRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={nodeRef}
      data-react-fancy-canvas-node=""
      data-node-id={id}
      className={cn("absolute", className)}
      style={{ left: x, top: y, ...style }}
    >
      {children}
    </div>
  );
}

CanvasNode.displayName = "CanvasNode";
