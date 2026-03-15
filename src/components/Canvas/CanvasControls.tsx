import { ZoomIn, ZoomOut, Maximize, RotateCcw } from "lucide-react";
import { cn } from "../../utils/cn";
import { useCanvas } from "./Canvas.context";
import type { CanvasControlsProps } from "./Canvas.types";

export function CanvasControls({
  className,
  showZoomIn = true,
  showZoomOut = true,
  showReset = true,
  showFitAll = true,
}: CanvasControlsProps) {
  const { setViewport, nodeRects, containerRef } = useCanvas();

  const zoomIn = () => setViewport((v) => ({ ...v, zoom: Math.min(3, v.zoom * 1.25) }));
  const zoomOut = () => setViewport((v) => ({ ...v, zoom: Math.max(0.1, v.zoom / 1.25) }));
  const reset = () => setViewport({ panX: 0, panY: 0, zoom: 1 });

  const fitAll = () => {
    const container = containerRef.current;
    if (!container || nodeRects.size === 0) return reset();

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
  };

  const btnClass =
    "flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors";

  return (
    <div
      data-react-fancy-canvas-controls=""
      className={cn(
        "absolute bottom-3 left-3 flex gap-1 rounded-lg border border-zinc-200 bg-white/90 p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90",
        className,
      )}
    >
      {showZoomIn && (
        <button type="button" onClick={zoomIn} className={btnClass} aria-label="Zoom in">
          <ZoomIn size={16} />
        </button>
      )}
      {showZoomOut && (
        <button type="button" onClick={zoomOut} className={btnClass} aria-label="Zoom out">
          <ZoomOut size={16} />
        </button>
      )}
      {showReset && (
        <button type="button" onClick={reset} className={btnClass} aria-label="Reset view">
          <RotateCcw size={16} />
        </button>
      )}
      {showFitAll && (
        <button type="button" onClick={fitAll} className={btnClass} aria-label="Fit all">
          <Maximize size={16} />
        </button>
      )}
    </div>
  );
}

CanvasControls.displayName = "CanvasControls";
