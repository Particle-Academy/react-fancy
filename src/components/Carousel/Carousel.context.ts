import { createContext, useContext } from "react";
import type { CarouselContextValue } from "./Carousel.types";

export const CarouselContext = createContext<CarouselContextValue | null>(null);

export function useCarousel(): CarouselContextValue {
  const ctx = useContext(CarouselContext);
  if (!ctx) {
    throw new Error("Carousel compound components must be used within <Carousel>");
  }
  return ctx;
}
