import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { useCanvas } from "./Canvas.context";
import type { CanvasMinimapProps } from "./Canvas.types";

export function CanvasMinimap({ width = 150, height = 100, className }: CanvasMinimapProps) {
  const { nodeRects, registryVersion, viewport } = useCanvas();

  const bounds = useMemo(() => {
    if (nodeRects.size === 0) return { minX: 0, minY: 0, maxX: 500, maxY: 300 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodeRects.forEach((r) => {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    });
    const padding = 50;
    return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };
  }, [nodeRects, registryVersion]);

  const scaleX = width / (bounds.maxX - bounds.minX || 1);
  const scaleY = height / (bounds.maxY - bounds.minY || 1);
  const scale = Math.min(scaleX, scaleY);

  return (
    <div
      data-react-fancy-canvas-minimap=""
      className={cn(
        "absolute right-3 bottom-3 overflow-hidden rounded-lg border border-zinc-200 bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/90",
        className,
      )}
      style={{ width, height }}
    >
      <svg width={width} height={height}>
        {Array.from(nodeRects.entries()).map(([id, rect]) => (
          <rect
            key={id}
            x={(rect.x - bounds.minX) * scale}
            y={(rect.y - bounds.minY) * scale}
            width={Math.max(rect.width * scale, 4)}
            height={Math.max(rect.height * scale, 3)}
            rx={1}
            className="fill-blue-400/60"
          />
        ))}
        {/* Viewport indicator */}
        <rect
          x={(-viewport.panX / viewport.zoom - bounds.minX) * scale}
          y={(-viewport.panY / viewport.zoom - bounds.minY) * scale}
          width={(width / viewport.zoom / scale > 0 ? width / viewport.zoom : width) * scale / (bounds.maxX - bounds.minX || 1) * (bounds.maxX - bounds.minX)}
          height={(height / viewport.zoom / scale > 0 ? height / viewport.zoom : height) * scale / (bounds.maxY - bounds.minY || 1) * (bounds.maxY - bounds.minY)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          className="text-blue-500"
        />
      </svg>
    </div>
  );
}

CanvasMinimap.displayName = "CanvasMinimap";
