import { cn } from "../../utils/cn";
import { useCarousel } from "./Carousel.context";
import type { CarouselStepsProps } from "./Carousel.types";

export function CarouselSteps({ className }: CarouselStepsProps) {
  const { activeIndex, totalSlides, goTo } = useCarousel();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {Array.from({ length: totalSlides }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => goTo(i)}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            i === activeIndex ? "bg-zinc-800 dark:bg-white" : "bg-zinc-300 dark:bg-zinc-600",
          )}
          aria-label={`Go to slide ${i + 1}`}
        />
      ))}
    </div>
  );
}
