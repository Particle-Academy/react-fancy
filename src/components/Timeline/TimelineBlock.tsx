import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { TimelineItem } from "./TimelineItem";
import type { TimelineBlockProps } from "./Timeline.types";

export const TimelineBlock = forwardRef<HTMLDivElement, TimelineBlockProps>(
  ({ heading, children, icon, emoji, color = "zinc", active = false, className }, ref) => {
    return (
      <TimelineItem icon={icon} emoji={emoji} color={color} active={active}>
        <div
          ref={ref}
          data-react-fancy-timeline-block=""
          className={cn(
            "rounded-lg border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] p-4 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
            active && "ring-2 ring-blue-500/20 dark:ring-blue-400/20",
            className,
          )}
        >
          {heading && (
            <div className="mb-2 text-sm font-semibold text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]">
              {heading}
            </div>
          )}
          <div className="text-sm text-[color:var(--fancy-text-subtle,var(--color-zinc-600))] dark:text-[color:var(--fancy-text-subtle-dark,var(--color-zinc-400))]">{children}</div>
        </div>
      </TimelineItem>
    );
  },
);

TimelineBlock.displayName = "TimelineBlock";
