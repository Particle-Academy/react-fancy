import type { ReactNode } from "react";

export interface CarouselContextValue {
  activeIndex: number;
  totalSlides: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  registerSlides: (count: number) => void;
}

export interface CarouselProps {
  children: ReactNode;
  defaultIndex?: number;
  className?: string;
  autoPlay?: boolean;
  interval?: number;
}

export interface CarouselSlideProps {
  children: ReactNode;
  className?: string;
}

export interface CarouselControlsProps {
  className?: string;
  prevLabel?: ReactNode;
  nextLabel?: ReactNode;
}

export interface CarouselStepsProps {
  className?: string;
}

export interface CarouselPanelsProps {
  children: ReactNode;
  className?: string;
}
