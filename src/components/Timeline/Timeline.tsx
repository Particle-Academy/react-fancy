import { Children, forwardRef } from "react";
import { cn } from "../../utils/cn";
import { TimelineContext } from "./Timeline.context";
import { TimelineItem } from "./TimelineItem";
import { TimelineBlock } from "./TimelineBlock";
import type { TimelineProps } from "./Timeline.types";

const TimelineRoot = forwardRef<HTMLDivElement, TimelineProps>(
  ({ children, orientation = "vertical", className }, ref) => {
    const items = Children.toArray(children);

    return (
      <div
        ref={ref}
        data-react-fancy-timeline=""
        data-orientation={orientation}
        className={cn(
          orientation === "vertical" ? "flex flex-col" : "flex flex-row items-center overflow-x-auto",
          className,
        )}
      >
        {items.map((child, i) => (
          <TimelineContext.Provider key={i} value={{ orientation, index: i }}>
            {child}
          </TimelineContext.Provider>
        ))}
      </div>
    );
  },
);

TimelineRoot.displayName = "Timeline";

export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
  Block: TimelineBlock,
});
