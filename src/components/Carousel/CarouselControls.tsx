import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { useCarousel } from "./Carousel.context";
import type { CarouselControlsProps } from "./Carousel.types";

export const CarouselControls = forwardRef<HTMLDivElement, CarouselControlsProps>(
  (
    {
      className,
      prevLabel,
      nextLabel,
      finishLabel,
    },
    ref,
  ) => {
    const { prev, next, activeIndex, totalSlides, variant, loop, onFinish, headless, labels } = useCarousel();

    // A visible text label names the button itself; adding an aria-label that
    // says something else would break label-in-name (WCAG 2.5.3). The default
    // glyphs, or a non-text label such as an icon, get the named label.
    const isText = (node: unknown) => typeof node === "string" || typeof node === "number";
    const prevName = isText(prevLabel) ? undefined : labels.previous;
    const nextName = isText(nextLabel) ? undefined : labels.next;

    if (headless) {
      return null;
    }

    const isFirst = activeIndex === 0;
    const isLast = activeIndex === totalSlides - 1;

    if (variant === "wizard") {
      return (
        <div ref={ref} data-react-fancy-carousel-controls="" className={cn("flex items-center gap-2", className)}>
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
          >
            {prevLabel ?? "Back"}
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onFinish}
              className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              {finishLabel ?? "Finish"}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
            >
              {nextLabel ?? "Next"}
            </button>
          )}
        </div>
      );
    }

    // Directional variant (default)
    const prevDisabled = !loop && isFirst;
    const nextDisabled = !loop && isLast;

    return (
      <div ref={ref} data-react-fancy-carousel-controls="" className={cn("flex items-center gap-2", className)}>
        <button
          type="button"
          onClick={prev}
          disabled={prevDisabled}
          aria-label={prevName}
          // The default glyphs are arrows, which Unicode does not mirror: flip
          // them in RTL so "previous" points to the inline start. A label the
          // consumer supplies is text and is left alone.
          className={cn("rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600", prevLabel == null && "rtl:-scale-x-100")}
        >
          {prevLabel ?? "\u2190"}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={nextDisabled}
          aria-label={nextName}
          className={cn("rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600", nextLabel == null && "rtl:-scale-x-100")}
        >
          {nextLabel ?? "\u2192"}
        </button>
      </div>
    );
  },
);

CarouselControls.displayName = "CarouselControls";
