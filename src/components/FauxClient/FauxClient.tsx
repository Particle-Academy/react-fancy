import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import type { FauxClientProps } from "./FauxClient.types";

const DOT_COLORS = ["bg-rose-300", "bg-amber-300", "bg-green-300"];

/**
 * A frame that mimics a browser window or device, rendering **real UI** inside.
 * With a logical `width` + `scale="fit"` it renders a full-size page/app and
 * scales it down to fit any container (live thumbnails, device mockups) — the
 * content is real and interactive, just zoomed.
 *
 * Omit `width` for chrome around natural-size content (e.g. a code/preview card).
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
      className,
      barClassName,
      bodyClassName,
      children,
      ...rest
    },
    ref,
  ) => {
    const scaled = typeof width === "number";
    const viewportRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [s, setS] = useState(typeof scale === "number" ? scale : 1);
    const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
      if (!scaled) return;
      const viewport = viewportRef.current;
      const stage = stageRef.current;
      if (!viewport || !stage) return;
      if (typeof ResizeObserver === "undefined") return;

      const measure = () => {
        const avail = viewport.clientWidth;
        const next = scale === "fit" ? (width && width > 0 ? avail / width : 1) : scale;
        // offsetHeight is the pre-transform layout height (CSS transforms don't affect it).
        const naturalHeight = stage.offsetHeight;
        setS(next);
        setContentHeight(naturalHeight * next);
      };

      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(viewport);
      ro.observe(stage);
      return () => ro.disconnect();
    }, [scaled, scale, width]);

    const isBrowser = variant === "browser";
    const isDevice = variant === "device";

    return (
      <div
        ref={ref}
        data-react-fancy-faux-client=""
        className={cn(
          "overflow-hidden bg-white dark:bg-zinc-900",
          isBrowser && "rounded-2xl border border-zinc-200 shadow-xl dark:border-zinc-800",
          isDevice && "rounded-[2rem] border-[10px] border-zinc-800 shadow-2xl dark:border-zinc-700",
          variant === "bare" && "rounded-lg border border-zinc-200 dark:border-zinc-800",
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
          className={cn("relative overflow-hidden", bodyClassName)}
          style={scaled ? { height: contentHeight } : undefined}
        >
          {scaled ? (
            <div
              ref={stageRef}
              className="absolute left-0 top-0 origin-top-left"
              style={{ width, transform: `scale(${s})` }}
            >
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    );
  },
);

FauxClient.displayName = "FauxClient";
