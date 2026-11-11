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
  keepMounted: boolean;
  labels: CarouselLabels;
}

/** Every string the carousel announces. All overridable through `labels`. */
export interface CarouselLabels {
  /** Accessible name of the default "previous" control. */
  previous: string;
  /** Accessible name of the default "next" control. */
  next: string;
  /** `aria-roledescription` of each slide. */
  slide: string;
  /** Accessible name of each slide. Slots: `{index}` (1-based), `{total}`. */
  slideOf: string;
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
  /**
   * Render every slide, the inactive ones `hidden` + `inert`, instead of only
   * the active one. Their content is then in the server-rendered HTML.
   * Default `true` for `directional` (slides are content), `false` for
   * `wizard` (each step mounts when it is reached).
   */
  keepMounted?: boolean;
  /** Override any announced string (see `CarouselLabels`). */
  labels?: Partial<CarouselLabels>;
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
