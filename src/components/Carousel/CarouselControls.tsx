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
    const { prev, next, activeIndex, totalSlides, variant, loop, onFinish, headless } = useCarousel();

    if (headless) {
      return null;
    }

    const isFirst = activeIndex === 0;
    const isLast = activeIndex === totalSlides - 1;

    if (variant === "wizard") {
      return (
        <div ref={ref} className={cn("flex items-center gap-2", className)}>
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
              className="rounded-lg border border-blue-500 bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
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
      <div ref={ref} className={cn("flex items-center gap-2", className)}>
        <button
          type="button"
          onClick={prev}
          disabled={prevDisabled}
          className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
        >
          {prevLabel ?? "\u2190"}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={nextDisabled}
          className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
        >
          {nextLabel ?? "\u2192"}
        </button>
      </div>
    );
  },
);

CarouselControls.displayName = "CarouselControls";
