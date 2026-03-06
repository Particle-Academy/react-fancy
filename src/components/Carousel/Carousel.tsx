import { useCallback, useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { CarouselContext } from "./Carousel.context";
import { CarouselPanels } from "./CarouselPanels";
import { CarouselSlide } from "./CarouselSlide";
import { CarouselControls } from "./CarouselControls";
import { CarouselSteps } from "./CarouselSteps";
import type { CarouselProps, CarouselContextValue } from "./Carousel.types";

function CarouselRoot({
  children,
  defaultIndex = 0,
  className,
}: CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const [totalSlides, setTotalSlides] = useState(0);

  const registerSlides = useCallback((count: number) => {
    setTotalSlides(count);
  }, []);

  const next = useCallback(
    () => setActiveIndex((i) => Math.min(i + 1, totalSlides - 1)),
    [totalSlides],
  );
  const prev = useCallback(
    () => setActiveIndex((i) => Math.max(i - 1, 0)),
    [],
  );
  const goTo = useCallback((index: number) => setActiveIndex(index), []);

  const ctx = useMemo<CarouselContextValue>(
    () => ({ activeIndex, totalSlides, next, prev, goTo, registerSlides }),
    [activeIndex, totalSlides, next, prev, goTo, registerSlides],
  );

  return (
    <CarouselContext.Provider value={ctx}>
      <div className={cn("relative", className)}>{children}</div>
    </CarouselContext.Provider>
  );
}

export const Carousel = Object.assign(CarouselRoot, {
  Panels: CarouselPanels,
  Slide: CarouselSlide,
  Controls: CarouselControls,
  Steps: CarouselSteps,
});
