import type { ReactNode } from "react";
import type { Color } from "../../utils/types";

export type TimelineVariant = "stacked" | "alternating" | "horizontal";

/** @deprecated Use TimelineVariant instead */
export type TimelineOrientation = "vertical" | "horizontal";

export interface TimelineEvent {
  /** Free-form date string */
  date?: string;
  /** Event heading */
  title: string;
  /** Body text (rendered as children) */
  description?: string;
  /** Emoji character for the dot */
  emoji?: string;
  /** Custom icon ReactNode for the dot */
  icon?: ReactNode;
  /** Accent color for the dot */
  color?: Color;
}

export interface TimelineProps {
  children?: ReactNode;
  /** Layout variant. Default: "stacked" */
  variant?: TimelineVariant;
  /** @deprecated Use variant instead. Maps "vertical" → "stacked", "horizontal" → "horizontal" */
  orientation?: TimelineOrientation;
  /** Data-driven events (alternative to children) */
  events?: TimelineEvent[];
  /** Optional heading above the timeline */
  heading?: ReactNode;
  /** Optional description below the heading */
  description?: ReactNode;
  /** Enable scroll-reveal animation. Default: true */
  animated?: boolean;
  className?: string;
}

export interface TimelineItemProps {
  children?: ReactNode;
  /** Custom icon ReactNode for the dot */
  icon?: ReactNode;
  /** Emoji character for the dot */
  emoji?: string;
  /** Date label displayed above the title */
  date?: string;
  /** Dot accent color */
  color?: Color;
  /** Whether this item is the active/current step */
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
  /** Emoji character for the dot */
  emoji?: string;
  /** Dot/icon color */
  color?: Color;
  /** Whether this block is the active/current step */
  active?: boolean;
  className?: string;
}
