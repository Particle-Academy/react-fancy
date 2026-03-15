import type { ReactNode } from "react";

export type CarouselVariant = "directional" | "wizard";

export interface CarouselContextValue {
  activeIndex: number;
  totalSlides: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  registerSlides: (count: number) => void;
  variant: CarouselVariant;
  loop: boolean;
  slideNames: string[];
  registerSlideNames: (names: string[]) => void;
  onFinish?: () => void;
  headless: boolean;
}

export interface CarouselProps {
  children: ReactNode;
  defaultIndex?: number;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  className?: string;
  autoPlay?: boolean;
  interval?: number;
  loop?: boolean;
  variant?: CarouselVariant;
  headless?: boolean;
  onFinish?: () => void;
}

export interface CarouselSlideProps {
  children: ReactNode;
  className?: string;
  name?: string;
}

export interface CarouselControlsProps {
  className?: string;
  prevLabel?: ReactNode;
  nextLabel?: ReactNode;
  finishLabel?: ReactNode;
}

export interface CarouselStepsProps {
  className?: string;
}

export interface CarouselPanelsProps {
  children: ReactNode;
  className?: string;
  transition?: "none" | "fade";
}
