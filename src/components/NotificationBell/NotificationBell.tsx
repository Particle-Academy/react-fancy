import { forwardRef, useId } from "react";
import { Bell } from "lucide-react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import { visuallyHidden } from "../../utils/visually-hidden";
import { Button } from "../Button";
import type { NotificationBellLabels, NotificationBellProps } from "./NotificationBell.types";

export const DEFAULT_NOTIFICATION_BELL_LABELS: Required<NotificationBellLabels> = {
  button: "Notifications",
  unread: "{count} unread notifications",
  unreadOne: "1 unread notification",
  none: "No unread notifications",
  overflow: "{max}+",
};

/**
 * An icon button with an unread count, built on the kit's `Button` (so touch
 * density makes it 44 x 44 like every other Button).
 *
 * The count is drawn in a badge that is hidden from assistive tech, and said
 * in words in a polite `role="status"` region beside the button, which also
 * describes the button: a screen reader hears "Notifications, 3 unread
 * notifications" on focus, and "3 unread notifications" when the count
 * changes. The region sits OUTSIDE the button, because a button's content is
 * presentational and a live region inside one is not reliably announced.
 */
export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(function NotificationBell(
  {
    count,
    max = 99,
    open,
    onOpenChange,
    labels,
    onClick,
    className,
    variant = "ghost",
    "aria-describedby": describedBy,
    ...rest
  },
  ref,
) {
  const statusId = useId();
  const words = { ...DEFAULT_NOTIFICATION_BELL_LABELS, ...labels };
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const cap = Math.max(1, Math.floor(max));
  const shown = n > cap ? fillLabel(words.overflow, { max: cap }) : String(n);
  const announcement = n === 0 ? words.none : n === 1 ? words.unreadOne : fillLabel(words.unread, { count: n });

  return (
    <>
      <Button
        ref={ref}
        type="button"
        variant={variant}
        aria-label={words.button}
        aria-expanded={open}
        data-react-fancy-notification-bell=""
        data-count={n}
        data-unread={n > 0 ? "true" : "false"}
        className={cn("relative", className)}
        {...rest}
        aria-describedby={[describedBy, statusId].filter(Boolean).join(" ")}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) onOpenChange?.(!open);
        }}
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {n > 0 && (
          <span
            aria-hidden="true"
            data-react-fancy-notification-bell-count=""
            className="pointer-events-none absolute -top-0.5 -end-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-800 px-1 text-[11px] font-semibold leading-none tabular-nums text-white dark:bg-red-800 dark:text-white"
          >
            {shown}
          </span>
        )}
      </Button>
      <span
        id={statusId}
        role="status"
        aria-live="polite"
        data-react-fancy-notification-bell-status=""
        className="sr-only"
        style={visuallyHidden}
      >
        {announcement}
      </span>
    </>
  );
});

NotificationBell.displayName = "NotificationBell";
