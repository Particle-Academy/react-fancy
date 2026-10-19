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
      fill = false,
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
    const hasControls = showZoom || showFullscreen;

    /*
     * Out of the way until wanted: hidden, and revealed when the pointer is over
     * the frame or focus is inside it (keyboard). Always shown where there is no
     * hover to reveal it (touch), or it could never be reached.
     *
     * In the browser chrome it sits in the address bar, inline. On a device or a
     * bare frame there is no chrome, so it floats top-right as a slim strip: the
     * bottom corners belong to the content (a slide viewer's page count lives
     * there).
     */
    const controlsBar = hasControls ? (
      <div
        data-react-fancy-faux-client-controls=""
        className={cn(
          "pointer-events-auto flex shrink-0 items-center gap-px opacity-0 transition-opacity duration-150",
          "group-hover/faux-client:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100",
          isBrowser
            ? "-my-1 text-zinc-400 dark:text-zinc-500"
            : "rounded-full bg-zinc-900/60 px-1 py-0.5 text-white/80 shadow-sm backdrop-blur-sm",
        )}
      >
        {showZoom && (
          <>
            <button
              type="button"
              data-react-fancy-faux-client-zoom-out=""
              aria-label="Zoom out"
              title="Zoom out"
              disabled={zoom <= minZoom}
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              className={controlButton(isBrowser)}
            >
              <ZoomOutIcon />
            </button>
            <button
              type="button"
              data-react-fancy-faux-client-zoom-reset=""
              aria-label="Reset zoom"
              title="Reset zoom"
              onClick={() => setZoom(1)}
              className={cn(controlButton(isBrowser), "w-auto min-w-[2.25rem] px-1 font-sans text-[10.5px] tabular-nums")}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              data-react-fancy-faux-client-zoom-in=""
              aria-label="Zoom in"
              title="Zoom in"
              disabled={zoom >= maxZoom}
              onClick={() => zoomBy(ZOOM_STEP)}
              className={controlButton(isBrowser)}
            >
              <ZoomInIcon />
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
            className={controlButton(isBrowser)}
          >
            {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        )}
      </div>
    ) : null;

    return (
      <div
        ref={setRefs}
        data-react-fancy-faux-client=""
        data-fullscreen={showFullscreen ? String(fullscreen) : undefined}
        className={cn(
          "group/faux-client relative overflow-hidden bg-white dark:bg-zinc-900",
          isBrowser && "rounded-2xl border border-zinc-200 shadow-xl dark:border-zinc-800",
          isDevice && "rounded-[2rem] border-[10px] border-zinc-800 shadow-2xl dark:border-zinc-700",
          variant === "bare" && "rounded-lg border border-zinc-200 dark:border-zinc-800",
          // Fill (or full screen): the frame takes its parent's height and its
          // body takes whatever the chrome leaves.
          (fill || fullscreen) && "flex flex-col",
          fill && "h-full",
          fullscreen && "rounded-none",
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
            {hasControls && <div className={cn(url == null && meta == null && "ml-auto")}>{controlsBar}</div>}
          </div>
        )}

        <div
          ref={viewportRef}
          className={cn(
            "relative",
            // Zoomed in, the content is bigger than the frame: scroll to it.
            zoomed ? "overflow-auto" : "overflow-hidden",
            (fill || fullscreen) && "min-h-0 flex-1",
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
              className={cn((fill || fullscreen) && "h-full")}
              // CSS `zoom` rather than a transform: it changes layout size, so the
              // content reflows and the viewport scrolls to all of it.
              style={zoomed ? { zoom: String(zoom) } : undefined}
            >
              {children}
            </div>
          )}
        </div>

        {hasControls && !isBrowser && (
          <div className="pointer-events-none absolute right-2 top-2 z-10">{controlsBar}</div>
        )}
      </div>
    );
  },
);

FauxClient.displayName = "FauxClient";

/** Ghost icon buttons: no box of their own, so the bar reads as part of the frame. */
function controlButton(inBar: boolean): string {
  return cn(
    "flex h-6 w-6 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-30",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
    inBar
      ? "hover:bg-zinc-900/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
      : "hover:bg-white/15 hover:text-white",
  );
}

function ZoomOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="M8 11h6" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="M8 11h6" />
      <path d="M11 8v6" />
    </svg>
  );
}

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
