import type { ElementType, HTMLAttributes } from "react";
import type { TimeInput } from "../../utils/relative-time";

/** One notification, as JSON. */
export interface NotificationItem {
  /** Stable id: the value `onMarkRead` and `onAction` receive, and the item's `data-*` handle. */
  id: string;
  title: string;
  body?: string;
  /** When it happened: epoch milliseconds, a `Date`, or an ISO 8601 string. Shown relative to `now`. */
  time: TimeInput;
  read: boolean;
  /** Where the item's action link goes. No `href`, no link. */
  href?: string;
  /** The action link's text. @default labels.action ("View") */
  actionLabel?: string;
}

/** The inbox's words, for translation. Each falls back to its English default. */
export interface NotificationInboxLabels {
  /** @default "Notifications" */
  heading?: string;
  /** Beside the heading while anything is unread. `{count}` is the number. @default "{count} unread" */
  unreadCount?: string;
  /** An unread item's state, in words. @default "Unread" */
  unread?: string;
  /** A read item's state, in words. @default "Read" */
  read?: string;
  /** The per-item button's visible text. @default "Mark as read" */
  markRead?: string;
  /** The per-item button's accessible name; keep the visible words in it. `{title}` is the item's title. @default "Mark as read: {title}" */
  markReadNamed?: string;
  /** @default "Mark all as read" */
  markAllRead?: string;
  /** An action link's text when the item has no `actionLabel`. @default "View" */
  action?: string;
  /** Shown when there are no items. @default "No notifications" */
  empty?: string;
}

export interface NotificationInboxProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The notifications, newest first (shown in the order given). */
  items: NotificationItem[];
  /** Called with an item's id from its "Mark as read" button. Without it, no per-item button. */
  onMarkRead?: (id: string) => void;
  /** Called from the header's "Mark all as read". Without it, no such button. */
  onMarkAllRead?: () => void;
  /** Called with an item's id when its action link is followed (before navigation). */
  onAction?: (id: string) => void;
  /**
   * Renders the action links: a router's `Link` (Inertia, React Router, Next)
   * for client-side navigation. It receives `href`, `className`, `dir`,
   * `onClick`, the `data-*` handle and `children`. @default "a"
   */
  linkComponent?: ElementType;
  /** BCP 47 locale for the relative times. Default: the runtime's. */
  locale?: string;
  /**
   * The moment relative times are measured from. Default: the time of render.
   * Pass a value you advance on an interval to keep "5 minutes ago" current,
   * or a fixed one for a deterministic render.
   */
  now?: TimeInput;
  /** The heading's level. @default 2 */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Every word, for translation. */
  labels?: NotificationInboxLabels;
}
