import type { ButtonProps } from "../Button/Button.types";

/** The bell's words, for translation. Each falls back to its English default. */
export interface NotificationBellLabels {
  /** The button's accessible name. @default "Notifications" */
  button?: string;
  /** The name while there is a count: the badge's number must be in it. `{button}` is `button`, `{count}` the badge text ("3", "99+"). @default "{button}, {count} unread" */
  buttonCount?: string;
  /** Announced, and describing the button, for two or more. `{count}` is the number. @default "{count} unread notifications" */
  unread?: string;
  /** The same for exactly one. @default "1 unread notification" */
  unreadOne?: string;
  /** The same for none. @default "No unread notifications" */
  none?: string;
  /** The badge when the count passes `max`. `{max}` is the cap. @default "{max}+" */
  overflow?: string;
}

/**
 * An icon button with an unread count. Controlled: `count` and `open` are data
 * in, `onOpenChange` (and `onClick`) are events out. Every other prop, and the
 * `ref`, reaches the `<button>` (a kit `Button`), so it works as the child of
 * `Popover.Trigger` or `Dropdown.Trigger`.
 */
export interface NotificationBellProps
  extends Omit<ButtonProps, "children" | "icon" | "iconTrailing" | "badge" | "badgeTrailing" | "href" | "as"> {
  /** Unread notifications. Negative or fractional values are floored at 0. */
  count: number;
  /** The badge shows `labels.overflow` ("99+") above this. @default 99 */
  max?: number;
  /**
   * Whether the inbox this bell opens is open, as `aria-expanded`. Leave it
   * unset when the bell opens nothing of its own, or when a `Popover.Trigger`
   * or `Dropdown.Trigger` around it sets the state.
   */
  open?: boolean;
  /** Called on click with the next open state (`!open`). It does not change `open` itself. */
  onOpenChange?: (open: boolean) => void;
  /** Every word, for translation. */
  labels?: NotificationBellLabels;
}
