import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { TimelineItem } from "./TimelineItem";
import type { TimelineBlockProps } from "./Timeline.types";

export const TimelineBlock = forwardRef<HTMLDivElement, TimelineBlockProps>(
  ({ heading, children, icon, color = "zinc", active = false, className }, ref) => {
    return (
      <TimelineItem icon={icon} color={color} active={active}>
        <div
          ref={ref}
          data-react-fancy-timeline-block=""
          className={cn(
            "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900",
            active && "ring-2 ring-blue-500/20 dark:ring-blue-400/20",
            className,
          )}
        >
          {heading && (
            <div className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {heading}
            </div>
          )}
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{children}</div>
        </div>
      </TimelineItem>
    );
  },
);

TimelineBlock.displayName = "TimelineBlock";
