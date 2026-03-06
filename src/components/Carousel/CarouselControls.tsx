import { cn } from "../../utils/cn";
import { useCarousel } from "./Carousel.context";
import type { CarouselControlsProps } from "./Carousel.types";

export function CarouselControls({
  className,
  prevLabel = "\u2190",
  nextLabel = "\u2192",
}: CarouselControlsProps) {
  const { prev, next, activeIndex, totalSlides } = useCarousel();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={prev}
        disabled={activeIndex === 0}
        className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
      >
        {prevLabel}
      </button>
      <button
        type="button"
        onClick={next}
        disabled={activeIndex === totalSlides - 1}
        className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
      >
        {nextLabel}
      </button>
    </div>
  );
}
