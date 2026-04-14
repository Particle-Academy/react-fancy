import type { ButtonHTMLAttributes } from "react";
import type { ActionColor, Size } from "../../utils/types";

export interface ActionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  /** Shape/fill variant */
  variant?: "default" | "circle" | "ghost";
  /** Standalone color (overrides state colors) */
  color?: ActionColor;
  size?: Size;
  /** Behavioral states */
  active?: boolean;
  checked?: boolean;
  warn?: boolean;
  alert?: boolean;
  /** Leading icon slug (resolved via Icon component, e.g. "pencil", "chevron-right") */
  icon?: string;
  /** Trailing icon slug (convenience for right-side icon) */
  iconTrailing?: string;
  /** Icon placement direction */
  iconPlace?:
    | "left" | "right" | "top" | "bottom"
    | "top left" | "top right" | "bottom left" | "bottom right"
    | "left top" | "left bottom" | "right top" | "right bottom";
  /** Pulsing alert icon slug */
  alertIcon?: string;
  /** Position alert icon on trailing side */
  alertIconTrailing?: boolean;
  /** Emoji slug (resolved via emoji-utils) */
  emoji?: string;
  /** Trailing emoji slug */
  emojiTrailing?: string;
  /** Avatar image URL */
  avatar?: string;
  /** Position avatar on trailing side */
  avatarTrailing?: boolean;
  /** Badge text */
  badge?: string;
  /** Position badge on trailing side */
  badgeTrailing?: boolean;
  /** Sort order of decorative elements: e=emoji, i=icon, a=avatar, b=badge */
  sort?: string;
  /** Show loading spinner */
  loading?: boolean;
  disabled?: boolean;
  /** Render as anchor tag */
  href?: string;
}
