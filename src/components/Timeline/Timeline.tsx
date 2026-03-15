import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { TimelineItem } from "./TimelineItem";
import { TimelineBlock } from "./TimelineBlock";
import type { TimelineProps } from "./Timeline.types";

const TimelineRoot = forwardRef<HTMLDivElement, TimelineProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        data-react-fancy-timeline=""
        className={cn("flex flex-col", className)}
      >
        {children}
      </div>
    );
  },
);

TimelineRoot.displayName = "Timeline";

export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
  Block: TimelineBlock,
});
