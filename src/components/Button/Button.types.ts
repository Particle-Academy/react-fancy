import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import type { ButtonColor, Size } from "../../utils/types";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  /** Shape/fill variant */
  variant?: "default" | "circle" | "ghost";
  /** Standalone color (overrides state colors) */
  color?: ButtonColor;
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
  /** Anchor `target` — only applies in `href` (anchor) mode. */
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  /** Anchor `rel` — only applies in `href` (anchor) mode. */
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
  /** Anchor `download` — only applies in `href` (anchor) mode. */
  download?: AnchorHTMLAttributes<HTMLAnchorElement>["download"];
  /**
   * Collapse to icon-only when squeezed — injects the minimal Tailwind classes
   * (`sr-only sm:not-sr-only`) onto the label so it stays screen-reader
   * accessible but visually hidden on small screens. The label is also directly
   * targetable via `data-react-fancy-button-label` for a custom breakpoint, e.g.
   * `className="[&_[data-react-fancy-button-label]]:hidden md:[&_[data-react-fancy-button-label]]:inline"`.
   */
  responsive?: boolean;
  /** Extra classes for the label wrapper — alignment, responsive hiding, etc. */
  labelClassName?: string;
}

/**
 * @deprecated Renamed to {@link ButtonProps}. `ActionProps` remains as an alias
 * for backward compatibility and will be removed in a future major version.
 */
export type ActionProps = ButtonProps;
