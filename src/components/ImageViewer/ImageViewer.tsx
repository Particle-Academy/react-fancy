import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { cn } from "../../utils/cn";
import { usePanZoom } from "../../hooks/use-pan-zoom";
import type { ImageViewerProps, ImageViewerViewport } from "./ImageViewer.types";

const DEFAULT_VIEWPORT: ImageViewerViewport = { panX: 0, panY: 0, zoom: 1 };

const fitClasses: Record<NonNullable<ImageViewerProps["fit"]>, string> = {
  contain: "h-full w-full object-contain",
  cover: "h-full w-full object-cover",
  none: "max-w-none object-none",
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * A standalone image viewer: fits the image to its container, with optional
 * Ctrl/⌘+wheel zoom, click-drag panning, and a transparency checkerboard. Works
 * anywhere on its own and is also what `<MediaViewer>` renders for images.
 *
 * The pan/zoom viewport is controllable (`viewport` + `onViewportChange`) so an
 * agent bridge can drive it; it's uncontrolled by default.
 *
 * ```tsx
 * <ImageViewer src="/logo.png" alt="logo.png" style={{ height: 320 }} />
 * ```
 */
export const ImageViewer = forwardRef<HTMLDivElement, ImageViewerProps>(
  (
    {
      src,
      alt = "",
      fit = "contain",
      zoomable = true,
      pannable = true,
      controls,
      minZoom = 0.25,
      maxZoom = 8,
      checkerboard = true,
      viewport,
      defaultViewport,
      onViewportChange,
      onLoad,
      onError,
      className,
      style,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

    // Controllable viewport supporting functional updates (usePanZoom needs them).
    const isControlled = viewport !== undefined;
    const [internal, setInternal] = useState<ImageViewerViewport>(
      defaultViewport ?? DEFAULT_VIEWPORT,
    );
    const current = isControlled ? viewport! : internal;
    const currentRef = useRef(current);
    currentRef.current = current;

    const setViewport = useCallback(
      (
        next:
          | ImageViewerViewport
          | ((prev: ImageViewerViewport) => ImageViewerViewport),
      ) => {
        const resolved =
          typeof next === "function" ? next(currentRef.current) : next;
        if (!isControlled) setInternal(resolved);
        onViewportChange?.(resolved);
      },
      [isControlled, onViewportChange],
    );

    const interactive = status === "loaded";
    const { containerProps, isPanning } = usePanZoom({
      viewport: current,
      setViewport,
      minZoom,
      maxZoom,
      pannable: pannable && interactive,
      zoomable: zoomable && interactive,
      containerRef,
    });

    // Zoom about the container centre — used by the +/− buttons.
    const zoomBy = useCallback(
      (factor: number) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        setViewport((prev) => {
          const newZoom = clamp(prev.zoom * factor, minZoom, maxZoom);
          const ratio = newZoom / prev.zoom;
          return {
            zoom: newZoom,
            panX: cx - (cx - prev.panX) * ratio,
            panY: cy - (cy - prev.panY) * ratio,
          };
        });
      },
      [setViewport, minZoom, maxZoom],
    );

    const reset = useCallback(() => setViewport(DEFAULT_VIEWPORT), [setViewport]);

    const showControls = (controls ?? zoomable) && interactive;
    const transform = `translate(${current.panX}px, ${current.panY}px) scale(${current.zoom})`;

    return (
      <div
        ref={ref}
        data-react-fancy-image-viewer=""
        className={cn(
          "relative isolate overflow-hidden rounded-md select-none",
          checkerboard
            ? "fancy-checkerboard"
            : "bg-zinc-100 dark:bg-zinc-900",
          className,
        )}
        style={style}
      >
        <div
          ref={containerRef}
          data-canvas-bg=""
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            isPanning
              ? "cursor-grabbing"
              : pannable && interactive
                ? "cursor-grab"
                : "",
          )}
          style={
            {
              transform,
              transformOrigin: "0 0",
              willChange: "transform",
              touchAction: zoomable || pannable ? "none" : undefined,
            } as CSSProperties
          }
          onDoubleClick={zoomable ? reset : undefined}
          {...containerProps}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={() => {
              setStatus("loaded");
              onLoad?.();
            }}
            onError={() => {
              setStatus("error");
              onError?.();
            }}
            className={cn(
              "pointer-events-none block",
              status === "error" && "hidden",
              fitClasses[fit],
            )}
          />
        </div>

        {status === "error" && (
          <div
            data-react-fancy-image-viewer-error=""
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center text-sm text-zinc-500 dark:text-zinc-400"
          >
            <span className="font-medium">Couldn&apos;t load image</span>
            <span className="max-w-full truncate text-xs opacity-70">{alt || src}</span>
          </div>
        )}

        {showControls && (
          <div
            data-react-fancy-image-viewer-controls=""
            className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white/90 p-0.5 text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200"
          >
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => zoomBy(1 / 1.25)}
              className="flex h-6 w-6 items-center justify-center rounded text-base leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Reset zoom"
              onClick={reset}
              className="min-w-[3rem] rounded px-1 text-center text-xs tabular-nums hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {Math.round(current.zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => zoomBy(1.25)}
              className="flex h-6 w-6 items-center justify-center rounded text-base leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              +
            </button>
          </div>
        )}
      </div>
    );
  },
);

ImageViewer.displayName = "ImageViewer";
