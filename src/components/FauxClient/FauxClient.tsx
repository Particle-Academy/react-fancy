import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import type { FauxClientProps } from "./FauxClient.types";

const DOT_COLORS = ["bg-rose-300", "bg-amber-300", "bg-green-300"];

/** One click of the zoom bar. Matches `ImageViewer`, so the kit zooms one way. */
const ZOOM_STEP = 1.25;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * A frame that mimics a browser window or device, rendering **real UI** inside.
 * With a logical `width` + `scale="fit"` it renders a full-size page/app and
 * scales it down to fit any container (live thumbnails, device mockups) — the
 * content is real and interactive, just zoomed.
 *
 * Omit `width` for chrome around natural-size content (e.g. a code/preview card).
 *
 * `controls` adds a zoom bar and a full-screen button, for content that has to be
 * READ rather than glanced at: a slide or a sheet shrunk to fit a panel.
 */
export const FauxClient = forwardRef<HTMLDivElement, FauxClientProps>(
  (
    {
      variant = "browser",
      url,
      meta,
      dots = true,
      width,
      scale = "fit",
      controls = false,
      zoom: controlledZoom,
      defaultZoom = 1,
      onZoomChange,
      minZoom = 0.5,
      maxZoom = 4,
      onFullscreenChange,
      className,
      barClassName,
      bodyClassName,
      children,
      ...rest
    },
    ref,
  ) => {
    const scaled = typeof width === "number";
    const rootRef = useRef<HTMLDivElement | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [fit, setFit] = useState(typeof scale === "number" ? scale : 1);
    const [naturalHeight, setNaturalHeight] = useState<number | undefined>(undefined);

    const showZoom = controls === true || (typeof controls === "object" && controls.zoom !== false);
    const showFullscreen = controls === true || (typeof controls === "object" && controls.fullscreen !== false);
    const [zoom, setZoom] = useControllableState(controlledZoom, defaultZoom, onZoomChange);
    const [fullscreen, setFullscreen] = useState(false);

    useLayoutEffect(() => {
      if (!scaled) return;
      const viewport = viewportRef.current;
      const stage = stageRef.current;
      if (!viewport || !stage) return;
      if (typeof ResizeObserver === "undefined") return;

      const measure = () => {
        const avail = viewport.clientWidth;
        setFit(scale === "fit" ? (width && width > 0 ? avail / width : 1) : scale);
        // offsetHeight is the pre-transform layout height (CSS transforms don't affect it).
        setNaturalHeight(stage.offsetHeight);
      };

      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(viewport);
      ro.observe(stage);
      return () => ro.disconnect();
    }, [scaled, scale, width]);

    // Full screen is the browser's state, not ours: follow it, so Esc and the
    // browser's own exit leave the button telling the truth.
    useEffect(() => {
      if (!showFullscreen || typeof document === "undefined") return;
      const sync = () => {
        const on = document.fullscreenElement != null && document.fullscreenElement === rootRef.current;
        setFullscreen(on);
        onFullscreenChange?.(on);
      };
      document.addEventListener("fullscreenchange", sync);
      return () => document.removeEventListener("fullscreenchange", sync);
    }, [showFullscreen, onFullscreenChange]);

    const toggleFullscreen = useCallback(() => {
      const el = rootRef.current;
      if (!el || typeof document === "undefined") return;
      if (document.fullscreenElement === el) void document.exitFullscreen?.();
      else void el.requestFullscreen?.();
    }, []);

    const zoomBy = (factor: number) => {
      // Rounded so ten clicks in and ten out land back on 100%, not 99.99%.
      setZoom(clamp(Math.round(zoom * factor * 100) / 100, minZoom, maxZoom));
    };

    const setRefs = (el: HTMLDivElement | null) => {
      rootRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    const isBrowser = variant === "browser";
    const isDevice = variant === "device";
    const effective = fit * zoom;
    const zoomed = zoom !== 1;

    return (
      <div
        ref={setRefs}
        data-react-fancy-faux-client=""
        data-fullscreen={showFullscreen ? String(fullscreen) : undefined}
        className={cn(
          "relative overflow-hidden bg-white dark:bg-zinc-900",
          isBrowser && "rounded-2xl border border-zinc-200 shadow-xl dark:border-zinc-800",
          isDevice && "rounded-[2rem] border-[10px] border-zinc-800 shadow-2xl dark:border-zinc-700",
          variant === "bare" && "rounded-lg border border-zinc-200 dark:border-zinc-800",
          // Full screen: the frame fills the screen and its body takes the room.
          fullscreen && "flex flex-col rounded-none",
          className,
        )}
        {...rest}
      >
        {isBrowser && (
          <div
            className={cn(
              "flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3.5 py-2.5 font-mono text-[11.5px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400",
              barClassName,
            )}
          >
            {dots && (
              <div className="mr-1.5 flex gap-[5px]">
                {DOT_COLORS.map((color, i) => (
                  <span key={i} className={cn("h-[9px] w-[9px] rounded-full", color)} />
                ))}
              </div>
            )}
            {url != null && <span className="min-w-0 flex-1 truncate">{url}</span>}
            {meta != null && <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{meta}</span>}
          </div>
        )}

        <div
          ref={viewportRef}
          className={cn(
            "relative",
            // Zoomed in, the content is bigger than the frame: scroll to it.
            zoomed ? "overflow-auto" : "overflow-hidden",
            fullscreen && "min-h-0 flex-1",
            bodyClassName,
          )}
          // The frame keeps its FIT height whatever the zoom; zooming scrolls.
          style={scaled && !fullscreen && naturalHeight !== undefined ? { height: naturalHeight * fit } : undefined}
        >
          {scaled ? (
            // A sizer the size of the zoomed content, so the scrollbars are right.
            <div
              style={
                naturalHeight !== undefined && width !== undefined
                  ? { width: width * effective, height: naturalHeight * effective, position: "relative" }
                  : undefined
              }
            >
              <div
                ref={stageRef}
                data-react-fancy-faux-client-content=""
                className="absolute left-0 top-0 origin-top-left"
                style={{ width, transform: `scale(${effective})` }}
              >
                {children}
              </div>
            </div>
          ) : (
            <div
              data-react-fancy-faux-client-content=""
              className={cn(fullscreen && "h-full")}
              // CSS `zoom` rather than a transform: it changes layout size, so the
              // content reflows and the viewport scrolls to all of it.
              style={zoomed ? { zoom: String(zoom) } : undefined}
            >
              {children}
            </div>
          )}
        </div>

        {(showZoom || showFullscreen) && (
          <div
            data-react-fancy-faux-client-controls=""
            className="absolute bottom-2 right-2 z-10 flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white/90 p-0.5 text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200"
          >
            {showZoom && (
              <>
                <button
                  type="button"
                  data-react-fancy-faux-client-zoom-out=""
                  aria-label="Zoom out"
                  disabled={zoom <= minZoom}
                  onClick={() => zoomBy(1 / ZOOM_STEP)}
                  className="flex h-6 w-6 items-center justify-center rounded text-base leading-none hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                >
                  −
                </button>
                <button
                  type="button"
                  data-react-fancy-faux-client-zoom-reset=""
                  aria-label="Reset zoom"
                  onClick={() => setZoom(1)}
                  className="min-w-[3rem] rounded px-1 text-center text-xs tabular-nums hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  data-react-fancy-faux-client-zoom-in=""
                  aria-label="Zoom in"
                  disabled={zoom >= maxZoom}
                  onClick={() => zoomBy(ZOOM_STEP)}
                  className="flex h-6 w-6 items-center justify-center rounded text-base leading-none hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                >
                  +
                </button>
              </>
            )}
            {showFullscreen && (
              <button
                type="button"
                data-react-fancy-faux-client-fullscreen=""
                aria-label={fullscreen ? "Exit full screen" : "Full screen"}
                aria-pressed={fullscreen}
                title={fullscreen ? "Exit full screen" : "Full screen"}
                onClick={toggleFullscreen}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

FauxClient.displayName = "FauxClient";

/** Inline, like `Input`'s reveal icons: a frame should not need an icon set configured. */
function FullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
