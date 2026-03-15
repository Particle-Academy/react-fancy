import type { ReactNode } from "react";

export interface TimelineProps {
  children: ReactNode;
  className?: string;
}

export interface TimelineItemProps {
  children: ReactNode;
  icon?: ReactNode;
  color?: "blue" | "green" | "amber" | "red" | "zinc";
  active?: boolean;
  className?: string;
}

export interface TimelineBlockProps {
  /** Block heading */
  heading?: ReactNode;
  /** Block description / body content */
  children: ReactNode;
  /** Optional icon displayed in the timeline dot */
  icon?: ReactNode;
  /** Dot/icon color */
  color?: "blue" | "green" | "amber" | "red" | "zinc";
  /** Whether this block is the active/current step */
  active?: boolean;
  className?: string;
}
