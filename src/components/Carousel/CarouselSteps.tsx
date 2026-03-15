import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { useCarousel } from "./Carousel.context";
import type { CarouselStepsProps } from "./Carousel.types";

export const CarouselSteps = forwardRef<HTMLDivElement, CarouselStepsProps>(
  ({ className }, ref) => {
    const { activeIndex, totalSlides, goTo, variant, slideNames, headless } = useCarousel();

    if (headless) {
      return null;
    }

    if (variant === "wizard") {
      return (
        <div ref={ref} data-react-fancy-carousel-steps="" className={cn("flex items-center gap-3", className)}>
          {Array.from({ length: totalSlides }, (_, i) => {
            const isActive = i === activeIndex;
            const isCompleted = i < activeIndex;
            const name = slideNames[i];

            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors",
                  isActive && "text-blue-600 dark:text-blue-400",
                  isCompleted && "text-green-600 dark:text-green-400",
                  !isActive && !isCompleted && "text-zinc-400 dark:text-zinc-500",
                )}
                aria-label={name || `Step ${i + 1}`}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isActive && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                    isCompleted && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                    !isActive && !isCompleted && "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
                  )}
                >
                  {isCompleted ? "\u2713" : i + 1}
                </span>
                {name && <span>{name}</span>}
              </button>
            );
          })}
        </div>
      );
    }

    // Directional variant: dot indicators (default)
    return (
      <div ref={ref} data-react-fancy-carousel-steps="" className={cn("flex items-center gap-1.5", className)}>
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
  },
);

CarouselSteps.displayName = "CarouselSteps";
