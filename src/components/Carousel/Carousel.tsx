import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { CarouselContext } from "./Carousel.context";
import { CarouselPanels } from "./CarouselPanels";
import { CarouselSlide } from "./CarouselSlide";
import { CarouselControls } from "./CarouselControls";
import { CarouselSteps } from "./CarouselSteps";
import type { CarouselProps, CarouselContextValue } from "./Carousel.types";

const CarouselRoot = forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      children,
      defaultIndex = 0,
      activeIndex: controlledIndex,
      onIndexChange,
      className,
      autoPlay = false,
      interval = 5000,
      loop = false,
      variant = "directional",
      headless = false,
      onFinish,
    },
    ref,
  ) => {
    const [activeIndex, setActiveIndex] = useControllableState<number>(
      controlledIndex,
      defaultIndex,
      onIndexChange,
    );
    const [totalSlides, setTotalSlides] = useState(0);
    const [slideNames, setSlideNames] = useState<string[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const onFinishRef = useRef(onFinish);
    onFinishRef.current = onFinish;

    const registerSlides = useCallback((count: number) => {
      setTotalSlides(count);
    }, []);

    const registerSlideNames = useCallback((names: string[]) => {
      setSlideNames(names);
    }, []);

    const next = useCallback(() => {
      setActiveIndex((i: number) => {
        if (i >= totalSlides - 1) {
          return loop ? 0 : i;
        }
        return i + 1;
      });
    }, [totalSlides, loop, setActiveIndex]);

    const prev = useCallback(() => {
      setActiveIndex((i: number) => {
        if (i <= 0) {
          return loop ? totalSlides - 1 : i;
        }
        return i - 1;
      });
    }, [totalSlides, loop, setActiveIndex]);

    const goTo = useCallback(
      (index: number) => setActiveIndex(index),
      [setActiveIndex],
    );

    // AutoPlay
    useEffect(() => {
      if (!autoPlay || isPaused || totalSlides <= 1) {
        return;
      }

      const id = setInterval(() => {
        setActiveIndex((i: number) => {
          if (i >= totalSlides - 1) {
            return loop ? 0 : i;
          }
          return i + 1;
        });
      }, interval);

      return () => clearInterval(id);
    }, [autoPlay, interval, isPaused, totalSlides, loop, setActiveIndex]);

    const ctx = useMemo<CarouselContextValue>(
      () => ({
        activeIndex,
        totalSlides,
        next,
        prev,
        goTo,
        registerSlides,
        variant,
        loop,
        slideNames,
        registerSlideNames,
        onFinish: onFinishRef.current,
        headless,
      }),
      [
        activeIndex,
        totalSlides,
        next,
        prev,
        goTo,
        registerSlides,
        variant,
        loop,
        slideNames,
        registerSlideNames,
        headless,
      ],
    );

    const handleMouseEnter = useCallback(() => {
      if (autoPlay) {
        setIsPaused(true);
      }
    }, [autoPlay]);

    const handleMouseLeave = useCallback(() => {
      if (autoPlay) {
        setIsPaused(false);
      }
    }, [autoPlay]);

    return (
      <CarouselContext.Provider value={ctx}>
        <div
          data-react-fancy-carousel=""
          ref={ref}
          className={cn("relative", className)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  },
);

CarouselRoot.displayName = "Carousel";

export const Carousel = Object.assign(CarouselRoot, {
  Panels: CarouselPanels,
  Slide: CarouselSlide,
  Controls: CarouselControls,
  Steps: CarouselSteps,
});
