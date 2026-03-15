import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { TimelineItemProps } from "./Timeline.types";

const dotColorClasses: Record<NonNullable<TimelineItemProps["color"]>, string> = {
  blue: "bg-blue-500 dark:bg-blue-400",
  green: "bg-green-500 dark:bg-green-400",
  amber: "bg-amber-500 dark:bg-amber-400",
  red: "bg-red-500 dark:bg-red-400",
  zinc: "bg-zinc-400 dark:bg-zinc-500",
};

const iconColorClasses: Record<NonNullable<TimelineItemProps["color"]>, string> = {
  blue: "text-blue-500 dark:text-blue-400",
  green: "text-green-500 dark:text-green-400",
  amber: "text-amber-500 dark:text-amber-400",
  red: "text-red-500 dark:text-red-400",
  zinc: "text-zinc-500 dark:text-zinc-400",
};

const ringColorClasses: Record<NonNullable<TimelineItemProps["color"]>, string> = {
  blue: "ring-blue-500/30 dark:ring-blue-400/30",
  green: "ring-green-500/30 dark:ring-green-400/30",
  amber: "ring-amber-500/30 dark:ring-amber-400/30",
  red: "ring-red-500/30 dark:ring-red-400/30",
  zinc: "ring-zinc-400/30 dark:ring-zinc-500/30",
};

export const TimelineItem = forwardRef<HTMLDivElement, TimelineItemProps>(
  (
    {
      children,
      icon,
      color = "zinc",
      active = false,
      className,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        data-react-fancy-timeline-item=""
        className={cn("relative flex gap-4 pb-8 last:pb-0", className)}
      >
        {/* Vertical connecting line */}
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-zinc-200 last:hidden dark:bg-zinc-700" />

        {/* Dot / Icon */}
        <div className="relative z-10 flex shrink-0">
          {icon ? (
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-zinc-900",
                iconColorClasses[color],
                active && "ring-4",
                active && ringColorClasses[color],
              )}
            >
              {icon}
            </span>
          ) : (
            <span
              className={cn(
                "mt-1.5 h-3 w-3 rounded-full",
                dotColorClasses[color],
                active && "ring-4",
                active && ringColorClasses[color],
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pt-0.5">{children}</div>
      </div>
    );
  },
);

TimelineItem.displayName = "TimelineItem";
