import { cn } from "../../utils/cn";
import type { CarouselSlideProps } from "./Carousel.types";

export function CarouselSlide({ children, className }: CarouselSlideProps) {
  return <div className={cn("w-full", className)}>{children}</div>;
}
