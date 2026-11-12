import { forwardRef, useId, type ElementType } from "react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import { formatRelativeTime, toTimestamp } from "../../utils/relative-time";
import { Button } from "../Button";
import type { NotificationInboxLabels, NotificationInboxProps } from "./NotificationInbox.types";

export const DEFAULT_NOTIFICATION_INBOX_LABELS: Required<NotificationInboxLabels> = {
  heading: "Notifications",
  unreadCount: "{count} unread",
  unread: "Unread",
  read: "Read",
  markRead: "Mark as read",
  markReadNamed: "Mark as read: {title}",
  markAllRead: "Mark all as read",
  action: "View",
  empty: "No notifications",
};

/*
 * Colours are the theme's text tokens, each clearing WCAG AAA (7:1) on the
 * surface token in both modes at their defaults: `text` (zinc-900 / zinc-100)
 * and `text-soft` (zinc-700 / zinc-300) on `surface` (white / zinc-900), and
 * `text` on `surface-muted` for the "Unread" chip. A host that re-tokens owns
 * the contrast of its own values.
 */
const TEXT =
  "text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]";
const TEXT_SOFT =
  "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]";
const SURFACE =
  "bg-[color:var(--fancy-surface,var(--color-white))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]";
const SURFACE_MUTED =
  "bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]";
const BORDER =
  "border-[color:var(--fancy-border,var(--color-zinc-200))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]";

/**
 * A controlled list of notifications: data in (`items`), events out
 * (`onMarkRead`, `onMarkAllRead`, `onAction`). It never changes an item's
 * read state itself; the host does, and passes the new `items`.
 *
 * Read and unread are said in words on every item ("Unread" / "Read"), with
 * weight and a dot as extra cues, never colour alone. Titles, bodies and
 * action text are `dir="auto"`, so a right-to-left notification lays out
 * right-to-left inside a left-to-right page.
 *
 * Live updates: the inbox holds no data, so whatever produces `items` keeps
 * it current. With fancy-query, that is a query over the notifications whose
 * cache an Echo event invalidates; the inbox re-renders when `items` changes.
 */
export const NotificationInbox = forwardRef<HTMLElement, NotificationInboxProps>(function NotificationInbox(
  {
    items,
    onMarkRead,
    onMarkAllRead,
    onAction,
    linkComponent,
    locale,
    now,
    headingLevel = 2,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const headingId = useId();
  const words = { ...DEFAULT_NOTIFICATION_INBOX_LABELS, ...labels };
  const Heading = `h${headingLevel}` as ElementType;
  const Link = (linkComponent ?? "a") as ElementType;
  const unread = items.filter((i) => !i.read).length;
  const from = now ?? Date.now();
  const absolute = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      data-react-fancy-notification-inbox=""
      data-unread={unread}
      {...rest}
      className={cn("overflow-hidden rounded-xl border", BORDER, SURFACE, TEXT, className)}
    >
      <div
        data-react-fancy-notification-inbox-header=""
        className={cn("flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2", BORDER)}
      >
        <div className="flex items-baseline gap-2">
          <Heading id={headingId} className={cn("text-sm font-semibold", TEXT)}>
            {words.heading}
          </Heading>
          {unread > 0 && (
            <span data-react-fancy-notification-inbox-count="" className={cn("text-xs", TEXT_SOFT)}>
              {fillLabel(words.unreadCount, { count: unread })}
            </span>
          )}
        </div>
        {onMarkAllRead && unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            data-react-fancy-notification-inbox-mark-all-read=""
            onClick={() => onMarkAllRead()}
          >
            {words.markAllRead}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p data-react-fancy-notification-inbox-empty="" className={cn("px-4 py-8 text-center text-sm", TEXT_SOFT)}>
          {words.empty}
        </p>
      ) : (
        <ul role="list" className={cn("divide-y", "divide-[color:var(--fancy-border,var(--color-zinc-200))] dark:divide-[color:var(--fancy-border-dark,var(--color-zinc-700))]")}>
          {items.map((item) => {
            const at = toTimestamp(item.time);
            const valid = Number.isFinite(at);
            return (
              <li
                key={item.id}
                data-react-fancy-notification-inbox-item={item.id}
                data-read={item.read ? "true" : "false"}
                className="flex gap-3 px-4 py-3"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    item.read
                      ? "bg-transparent"
                      : "bg-[color:var(--fancy-accent,var(--color-blue-600))] dark:bg-[color:var(--fancy-accent-dark,var(--color-blue-500))]",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      dir="auto"
                      data-react-fancy-notification-inbox-title=""
                      className={cn("min-w-0 text-sm", TEXT, !item.read && "font-semibold")}
                    >
                      {item.title}
                    </p>
                    {valid && (
                      <time
                        dateTime={new Date(at).toISOString()}
                        title={absolute.format(at)}
                        data-react-fancy-notification-inbox-time=""
                        className={cn("shrink-0 text-xs", TEXT_SOFT)}
                        // Relative to the render's clock, which differs between
                        // a server render and hydration by however long it took.
                        suppressHydrationWarning
                      >
                        {formatRelativeTime(at, { now: from, locale })}
                      </time>
                    )}
                  </div>
                  {item.body && (
                    <p dir="auto" data-react-fancy-notification-inbox-body="" className={cn("mt-0.5 text-sm", TEXT_SOFT)}>
                      {item.body}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      data-react-fancy-notification-inbox-state={item.read ? "read" : "unread"}
                      className={cn(
                        "text-xs",
                        item.read ? TEXT_SOFT : cn("rounded-full px-2 py-0.5 font-medium", SURFACE_MUTED, TEXT),
                      )}
                    >
                      {item.read ? words.read : words.unread}
                    </span>
                    {item.href && (
                      <Link
                        href={item.href}
                        dir="auto"
                        data-react-fancy-notification-inbox-action=""
                        onClick={() => onAction?.(item.id)}
                        className={cn(
                          "rounded text-sm font-medium underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))] dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]",
                          TEXT,
                        )}
                      >
                        {item.actionLabel ?? words.action}
                      </Link>
                    )}
                    {!item.read && onMarkRead && (
                      <Button
                        variant="ghost"
                        size="xs"
                        data-react-fancy-notification-inbox-mark-read=""
                        aria-label={fillLabel(words.markReadNamed, { title: item.title })}
                        onClick={() => onMarkRead(item.id)}
                      >
                        {words.markRead}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
});

NotificationInbox.displayName = "NotificationInbox";
