import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode, SyntheticEvent } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import type { PdfPageSource, PdfViewerPolicy, PdfViewerWatermark } from "./PdfViewer.types";

/** One click of the zoom bar. Matches `FauxClient` and `ImageViewer`. */
const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
/** The resolutions a page is requested at, so zooming refetches rarely. */
const SCALE_BUCKETS = [1, 1.5, 2, 3, 4];
/** How long PrintScreen keeps the pages obscured. */
const PRINT_SCREEN_MS = 1500;
/** Gap around and between pages, px. */
const GAP = 16;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function scaleBucket(zoom: number): number {
  const dpr = typeof window !== "undefined" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const want = zoom * dpr;
  return SCALE_BUCKETS.find((b) => b >= want - 1e-9) ?? SCALE_BUCKETS[SCALE_BUCKETS.length - 1];
}

/*
 * Print is blanked from CSS, because a page can print without our key handler
 * ever seeing it (the browser menu, window.print()). `*` as well as the root, so
 * no descendant can set itself visible again.
 */
const PRINT_BLOCK_CSS =
  '@media print{[data-react-fancy-pdf-viewer][data-print-blocked="true"],[data-react-fancy-pdf-viewer][data-print-blocked="true"] *{visibility:hidden!important}}';

export interface PdfPagesProps {
  pages: PdfPageSource;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  zoom?: number;
  defaultZoom?: number;
  onZoomChange?: (zoom: number) => void;
  policy?: PdfViewerPolicy;
  watermark?: PdfViewerWatermark;
  title: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Page-image mode of `PdfViewer`: images the app rendered, shown under a policy.
 * It never sees the PDF, so it has nothing to search and nothing to download.
 */
export const PdfPages = forwardRef<HTMLDivElement, PdfPagesProps>(
  (
    {
      pages,
      page: controlledPage,
      defaultPage = 1,
      onPageChange,
      zoom: controlledZoom,
      defaultZoom = 1,
      onZoomChange,
      policy,
      watermark,
      title,
      className,
      style,
    },
    ref,
  ) => {
    const count = Math.max(0, Math.floor(pages.count));
    const download = policy?.download !== false;
    const print = policy?.print !== false;
    const copy = policy?.copy !== false;
    const deter = policy?.screenshot === "deter";

    const [rawPage, setPage] = useControllableState(controlledPage, defaultPage, onPageChange);
    const page = clamp(rawPage, 1, Math.max(1, count));
    const [zoom, setZoom] = useControllableState(controlledZoom, defaultZoom, onZoomChange);
    const scale = scaleBucket(zoom);

    const scrollerRef = useRef<HTMLDivElement>(null);
    const [ratios, setRatios] = useState<Record<number, number>>({});
    const ratioOf = (n: number) => ratios[n] ?? pages.aspectRatio ?? 1 / Math.SQRT2;

    // ---- Which pages have an image: those near the viewport ---------------
    // Without IntersectionObserver there is no way to know what is near, so
    // every page renders (SSR markup, very old browsers).
    const observable = typeof IntersectionObserver !== "undefined";
    const [near, setNear] = useState<Set<number>>(() => new Set([page, page + 1]));
    const isNear = (n: number) => !observable || n === page || near.has(n);

    useEffect(() => {
      const scroller = scrollerRef.current;
      if (!observable || !scroller) return;
      const io = new IntersectionObserver(
        (entries) => {
          setNear((prev) => {
            const next = new Set(prev);
            for (const e of entries) {
              const n = Number((e.target as HTMLElement).dataset.page);
              if (e.isIntersecting) next.add(n);
              else next.delete(n);
            }
            return next;
          });
        },
        // A viewport's worth above and below, so a page is there before it scrolls in.
        { root: scroller, rootMargin: "100% 0px" },
      );
      scroller.querySelectorAll("[data-react-fancy-pdf-viewer-page]").forEach((el) => io.observe(el));
      return () => io.disconnect();
    }, [observable, count]);

    // ---- The current page follows scrolling; a set page scrolls to it ------
    const fromScroll = useRef<number | null>(null);
    const scrollToPage = useCallback((n: number) => {
      const scroller = scrollerRef.current;
      const slot = scroller?.querySelector<HTMLElement>(`[data-react-fancy-pdf-viewer-page][data-page="${n}"]`);
      if (scroller && slot) scroller.scrollTop = Math.max(0, slot.offsetTop - GAP);
    }, []);

    useEffect(() => {
      if (fromScroll.current === page) {
        fromScroll.current = null;
        return;
      }
      scrollToPage(page);
    }, [page, scrollToPage]);

    // Zooming changes every page's height: keep the current page in place.
    const firstZoom = useRef(true);
    useLayoutEffect(() => {
      if (firstZoom.current) {
        firstZoom.current = false;
        return;
      }
      scrollToPage(page);
      // Only on zoom; the page effect handles page changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoom]);

    // A width change (full screen, a resized panel) re-flows every page's
    // height, so the scroll offset no longer points at the same page: put the
    // current one back.
    const pageRef = useRef(page);
    pageRef.current = page;
    useEffect(() => {
      const scroller = scrollerRef.current;
      if (!scroller || typeof ResizeObserver === "undefined") return;
      let width: number | null = null;
      const ro = new ResizeObserver(() => {
        const w = scroller.clientWidth;
        if (width !== null && w !== width) scrollToPage(pageRef.current);
        width = w;
      });
      ro.observe(scroller);
      return () => ro.disconnect();
    }, [scrollToPage]);

    const frame = useRef(0);
    const onScroll = () => {
      if (frame.current || typeof requestAnimationFrame === "undefined") return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const scroller = scrollerRef.current;
        if (!scroller) return;
        // The page under a line a third of the way down the viewport.
        const line = scroller.getBoundingClientRect().top + scroller.clientHeight / 3;
        let current = 1;
        scroller.querySelectorAll<HTMLElement>("[data-react-fancy-pdf-viewer-page]").forEach((el) => {
          if (el.getBoundingClientRect().top <= line) current = Number(el.dataset.page);
        });
        if (current !== page) {
          fromScroll.current = current;
          setPage(current);
        }
      });
    };
    useEffect(() => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    }, []);

    const zoomTo = (z: number) => setZoom(clamp(Math.round(z * 100) / 100, MIN_ZOOM, MAX_ZOOM));
    const fitPage = () => {
      const scroller = scrollerRef.current;
      if (!scroller || scroller.clientWidth <= GAP * 2) return;
      const pageHeightAtFit = (scroller.clientWidth - GAP * 2) / ratioOf(page);
      zoomTo((scroller.clientHeight - GAP * 2) / pageHeightAtFit);
    };

    // ---- screenshot: "deter" ---------------------------------------------
    const [hidden, setHidden] = useState(false);
    const [blurred, setBlurred] = useState(false);
    const [snapped, setSnapped] = useState(false);
    useEffect(() => {
      if (!deter || typeof window === "undefined") return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onVisibility = () => setHidden(document.visibilityState === "hidden");
      const onBlur = () => setBlurred(true);
      const onFocus = () => setBlurred(false);
      const onKeyUp = (e: globalThis.KeyboardEvent) => {
        if (e.key !== "PrintScreen") return;
        // Best effort. The OS has usually taken the shot before this fires;
        // what is left is to obscure, and to clear a capture that went to the
        // clipboard (which fails quietly where the page may not write it).
        setSnapped(true);
        clearTimeout(timer);
        timer = setTimeout(() => setSnapped(false), PRINT_SCREEN_MS);
        void navigator.clipboard?.writeText?.("").catch(() => {});
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onBlur);
      window.addEventListener("focus", onFocus);
      window.addEventListener("keyup", onKeyUp);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("keyup", onKeyUp);
      };
    }, [deter]);
    const obscured = deter && (hidden || blurred || snapped);

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (!print && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") e.preventDefault();
    };
    const block = (e: SyntheticEvent) => e.preventDefault();

    const markId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

    return (
      <div
        ref={ref}
        data-react-fancy-pdf-viewer=""
        data-mode="pages"
        data-print-blocked={print ? undefined : "true"}
        data-obscured={String(obscured)}
        aria-label={title}
        role="document"
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex h-full min-h-[20rem] w-full flex-col overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900",
          className,
        )}
        style={copy ? style : { ...style, userSelect: "none", WebkitUserSelect: "none" }}
      >
        {!print && <style>{PRINT_BLOCK_CSS}</style>}

        <div
          data-react-fancy-pdf-viewer-toolbar=""
          className="flex shrink-0 items-center gap-1 border-b border-zinc-200 bg-[color:var(--fancy-surface,var(--color-white))] px-2 py-1 text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:border-zinc-800 dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]"
        >
          <ToolButton attr="prev" label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <Chevron dir="up" />
          </ToolButton>
          <span data-react-fancy-pdf-viewer-page-label="" className="min-w-[3.5rem] text-center tabular-nums" aria-live="polite">
            {page} / {count}
          </span>
          <ToolButton attr="next" label="Next page" disabled={page >= count} onClick={() => setPage(page + 1)}>
            <Chevron dir="down" />
          </ToolButton>
          <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden="true" />
          <ToolButton attr="zoom-out" label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => zoomTo(zoom / ZOOM_STEP)}>
            <span aria-hidden="true">−</span>
          </ToolButton>
          <ToolButton attr="zoom-reset" label="Reset zoom" wide onClick={() => zoomTo(1)}>
            {Math.round(zoom * 100)}%
          </ToolButton>
          <ToolButton attr="zoom-in" label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => zoomTo(zoom * ZOOM_STEP)}>
            <span aria-hidden="true">+</span>
          </ToolButton>
          <ToolButton attr="fit-width" label="Fit width" wide onClick={() => zoomTo(1)}>
            Width
          </ToolButton>
          <ToolButton attr="fit-page" label="Fit page" wide onClick={fitPage}>
            Page
          </ToolButton>
        </div>

        <div
          ref={scrollerRef}
          data-react-fancy-pdf-viewer-pages=""
          tabIndex={0}
          onScroll={onScroll}
          onContextMenu={download ? undefined : block}
          onDragStart={download ? undefined : block}
          className="relative min-h-0 flex-1 overflow-auto outline-none transition-[filter] duration-150"
          style={{ padding: GAP, filter: obscured ? "blur(24px)" : undefined }}
        >
          <div className="mx-auto flex flex-col" style={{ width: `${zoom * 100}%`, gap: GAP }}>
            {Array.from({ length: count }, (_, i) => {
              const n = i + 1;
              return (
                <div
                  key={n}
                  data-react-fancy-pdf-viewer-page=""
                  data-page={n}
                  className="relative w-full overflow-hidden bg-white shadow-sm"
                  style={{ aspectRatio: String(ratioOf(n)) }}
                >
                  {isNear(n) && (
                    <img
                      data-react-fancy-pdf-viewer-image=""
                      src={pages.url(n, scale)}
                      alt={`Page ${n}`}
                      decoding="async"
                      draggable={download ? undefined : false}
                      className="block h-full w-full"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                          const r = img.naturalWidth / img.naturalHeight;
                          setRatios((prev) => (prev[n] === r ? prev : { ...prev, [n]: r }));
                        }
                      }}
                    />
                  )}
                  {watermark?.text && <Watermark id={`${markId}-${n}`} {...watermark} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

PdfPages.displayName = "PdfPages";

/** A tiled SVG pattern, so the text repeats at a constant size whatever the zoom. */
function Watermark({ id, text, opacity = 0.15, angle = -30, density = 1 }: PdfViewerWatermark & { id: string }) {
  const fontSize = 14;
  const gap = 80 / Math.max(0.1, density);
  const w = text.length * fontSize * 0.55 + gap;
  const h = fontSize + gap;
  return (
    <svg
      data-react-fancy-pdf-viewer-watermark=""
      aria-hidden="true"
      className="absolute inset-0 h-full w-full select-none"
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
          <text x={gap / 2} y={h / 2} fontSize={fontSize} fontFamily="ui-sans-serif, system-ui, sans-serif" fillOpacity={clamp(opacity, 0, 1)}
            // The light-mode text role in both modes: page images are paper.
            style={{ fill: "var(--fancy-text, var(--color-zinc-700))" }}
          >
            {text}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function ToolButton({
  attr,
  label,
  disabled,
  wide,
  onClick,
  children,
}: {
  attr: string;
  label: string;
  disabled?: boolean;
  wide?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...{ [`data-react-fancy-pdf-viewer-${attr}`]: "" }}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-6 items-center justify-center rounded-full tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-30",
        "hover:bg-zinc-900/5 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:bg-white/10 dark:hover:text-zinc-200",
        wide ? "min-w-[2.25rem] px-1.5" : "w-6",
      )}
    >
      {children}
    </button>
  );
}

function Chevron({ dir }: { dir: "up" | "down" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "up" ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}
