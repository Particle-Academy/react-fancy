import type { ReactNode, ButtonHTMLAttributes } from "react";
import type { ActionColor, Size } from "../../utils/types";

export interface ActionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  /** Shape variant */
  variant?: "default" | "circle";
  /** Standalone color (overrides state colors) */
  color?: ActionColor;
  size?: Size;
  /** Behavioral states */
  active?: boolean;
  checked?: boolean;
  warn?: boolean;
  alert?: boolean;
  /** Leading icon (ReactNode) */
  icon?: ReactNode;
  /** Trailing icon (convenience for right-side icon) */
  iconTrailing?: ReactNode;
  /** Icon placement direction */
  iconPlace?: "left" | "right" | "top" | "bottom";
  /** Pulsing alert icon */
  alertIcon?: ReactNode;
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
