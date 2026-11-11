import { Children, forwardRef, isValidElement, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import { useCarousel } from "./Carousel.context";
import type { CarouselPanelsProps, CarouselSlideProps } from "./Carousel.types";

export const CarouselPanels = forwardRef<HTMLDivElement, CarouselPanelsProps>(
  ({ children, className, transition = "none" }, ref) => {
    const { activeIndex, registerSlides, registerSlideNames, keepMounted, labels } = useCarousel();
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

    const fading = transition === "fade" && transitionState === "enter";
    const total = slides.length;

    // Each slide sits in an APG "slide" group. With keepMounted every slide is
    // rendered (so all of them reach the server-rendered HTML) and the inactive
    // ones are `hidden` + `inert`: out of layout, focus order and the
    // accessibility tree. Without it, only the active slide is rendered.
    const item = (slide: (typeof slides)[number], index: number) => {
      const active = index === activeIndex;
      return (
        <div
          key={isValidElement(slide) && slide.key != null ? slide.key : index}
          data-react-fancy-carousel-item=""
          data-state={active ? "active" : "inactive"}
          role="group"
          aria-roledescription={labels.slide}
          aria-label={fillLabel(labels.slideOf, { index: index + 1, total })}
          hidden={!active}
          inert={!active}
          className={cn(active && fading && "fancy-fade-in")}
          style={active && fading ? { animationDuration: "300ms" } : undefined}
        >
          {slide}
        </div>
      );
    };

    return (
      <div ref={ref} data-react-fancy-carousel-panels="" className={cn("relative overflow-hidden", className)}>
        {keepMounted
          ? slides.map(item)
          : activeIndex >= 0 && activeIndex < total
            ? item(slides[activeIndex], activeIndex)
            : null}
      </div>
    );
  },
);

CarouselPanels.displayName = "CarouselPanels";
