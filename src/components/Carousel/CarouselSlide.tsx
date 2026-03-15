import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { CarouselSlideProps } from "./Carousel.types";

export const CarouselSlide = forwardRef<HTMLDivElement, CarouselSlideProps>(
  ({ children, className, name: _name }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)}>
        {children}
      </div>
    );
  },
);

CarouselSlide.displayName = "CarouselSlide";
