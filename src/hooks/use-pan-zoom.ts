import { useCallback, useEffect, useRef } from "react";

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

interface UsePanZoomOptions {
  viewport: ViewportState;
  setViewport: (vp: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
  minZoom: number;
  maxZoom: number;
  pannable: boolean;
  zoomable: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
}

interface UsePanZoomReturn {
  containerProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
  isPanning: boolean;
}

export function usePanZoom({
  viewport,
  setViewport,
  minZoom,
  maxZoom,
  pannable,
  zoomable,
  containerRef,
}: UsePanZoomOptions): UsePanZoomReturn {
  const isPanningRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Store latest values in refs so the native wheel listener always sees current state
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const setViewportRef = useRef(setViewport);
  setViewportRef.current = setViewport;
  const zoomableRef = useRef(zoomable);
  zoomableRef.current = zoomable;
  const minZoomRef = useRef(minZoom);
  minZoomRef.current = minZoom;
  const maxZoomRef = useRef(maxZoom);
  maxZoomRef.current = maxZoom;

  // Attach a non-passive wheel listener so preventDefault() actually stops page scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      if (!zoomableRef.current) return;
      e.preventDefault();

      const rect = container!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setViewportRef.current((prev) => {
        const factor = 1 - e.deltaY * 0.001;
        const newZoom = Math.min(maxZoomRef.current, Math.max(minZoomRef.current, prev.zoom * factor));
        const ratio = newZoom / prev.zoom;

        return {
          zoom: newZoom,
          panX: mouseX - (mouseX - prev.panX) * ratio,
          panY: mouseY - (mouseY - prev.panY) * ratio,
        };
      });
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!pannable) return;
      // Only pan on primary button and when clicking the background
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target !== containerRef.current && !target.hasAttribute("data-canvas-bg")) return;

      isPanningRef.current = true;
      startRef.current = { x: e.clientX, y: e.clientY, panX: viewport.panX, panY: viewport.panY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [pannable, viewport.panX, viewport.panY, containerRef],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      setViewport((prev) => ({
        ...prev,
        panX: startRef.current.panX + dx,
        panY: startRef.current.panY + dy,
      }));
    },
    [setViewport],
  );

  const onPointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  return {
    containerProps: { onPointerDown, onPointerMove, onPointerUp },
    isPanning: isPanningRef.current,
  };
}
