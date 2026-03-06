import { Children, useEffect } from "react";
import { cn } from "../../utils/cn";
import { useCarousel } from "./Carousel.context";
import type { CarouselPanelsProps } from "./Carousel.types";

export function CarouselPanels({ children, className }: CarouselPanelsProps) {
  const { activeIndex, registerSlides } = useCarousel();
  const slides = Children.toArray(children);

  useEffect(() => {
    registerSlides(slides.length);
  }, [slides.length, registerSlides]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {slides[activeIndex]}
    </div>
  );
}
