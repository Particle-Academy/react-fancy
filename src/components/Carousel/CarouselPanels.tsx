import { Children, forwardRef, isValidElement, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { useCarousel } from "./Carousel.context";
import type { CarouselPanelsProps, CarouselSlideProps } from "./Carousel.types";

export const CarouselPanels = forwardRef<HTMLDivElement, CarouselPanelsProps>(
  ({ children, className, transition = "none" }, ref) => {
    const { activeIndex, registerSlides, registerSlideNames } = useCarousel();
    const slides = Children.toArray(children);
    const prevIndexRef = useRef(activeIndex);
    const [transitionState, setTransitionState] = useState<"enter" | "idle">("idle");

    // Register slide count
    useEffect(() => {
      registerSlides(slides.length);
    }, [slides.length, registerSlides]);

    // Register slide names from the `name` prop on each Carousel.Slide
    useEffect(() => {
      const names = slides.map((slide) => {
        if (isValidElement<CarouselSlideProps>(slide) && slide.props.name) {
          return slide.props.name;
        }
        return "";
      });
      registerSlideNames(names);
    }, [slides.length, registerSlideNames]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle fade transition when activeIndex changes
    useEffect(() => {
      if (transition !== "fade") {
        return;
      }

      if (prevIndexRef.current !== activeIndex) {
        setTransitionState("enter");
        const timer = setTimeout(() => {
          setTransitionState("idle");
        }, 300);
        prevIndexRef.current = activeIndex;
        return () => clearTimeout(timer);
      }
    }, [activeIndex, transition]);

    if (transition === "fade") {
      return (
        <div ref={ref} className={cn("relative overflow-hidden", className)}>
          <div
            key={activeIndex}
            className={cn(
              transitionState === "enter" && "fancy-fade-in",
            )}
            style={{
              animationDuration: transitionState === "enter" ? "300ms" : undefined,
            }}
          >
            {slides[activeIndex]}
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("relative overflow-hidden", className)}>
        {slides[activeIndex]}
      </div>
    );
  },
);

CarouselPanels.displayName = "CarouselPanels";
