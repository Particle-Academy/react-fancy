import { Children, forwardRef, useCallback, useRef, type WheelEvent } from "react";
import { cn } from "../../utils/cn";
import { TimelineContext } from "./Timeline.context";
import { TimelineItem } from "./TimelineItem";
import { TimelineBlock } from "./TimelineBlock";
import type { TimelineProps, TimelineVariant } from "./Timeline.types";

const TimelineRoot = forwardRef<HTMLDivElement, TimelineProps>(
  ({
    children,
    variant: variantProp,
    orientation,
    events,
    heading,
    description,
    animated = true,
    className,
  }, ref) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Backward compat: map deprecated orientation to variant
    let variant: TimelineVariant = variantProp ?? "stacked";
    if (!variantProp && orientation) {
      variant = orientation === "horizontal" ? "horizontal" : "stacked";
    }

    const isHorizontal = variant === "horizontal";

    // Build items from events prop (data-driven) or children (compound)
    const items = events
      ? events.map((e, i) => (
          <TimelineItem key={i} date={e.date} emoji={e.emoji} icon={e.icon} color={e.color}>
            {e.title && <h3 className="font-semibold text-zinc-900 dark:text-white">{e.title}</h3>}
            {e.description && <div className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{e.description}</div>}
          </TimelineItem>
        ))
      : Children.toArray(children);

    const handleWheel = useCallback((e: WheelEvent) => {
      if (!scrollRef.current) return;
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }, []);

    const content = items.map((child, i) => (
      <TimelineContext.Provider key={i} value={{ variant, index: i, total: items.length, animated }}>
        {child}
      </TimelineContext.Provider>
    ));

    return (
      <div ref={ref} data-react-fancy-timeline="" data-variant={variant} className={className}>
        {(heading || description) && (
          <div className="mb-8">
            {heading && <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{heading}</h2>}
            {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
          </div>
        )}

        {isHorizontal ? (
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-4 -mb-4"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgb(161 161 170) transparent" }}
            onWheel={handleWheel}
          >
            <div className="flex min-w-max items-start">
              {content}
            </div>
          </div>
        ) : (
          <div>{content}</div>
        )}
      </div>
    );
  },
);

TimelineRoot.displayName = "Timeline";

export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
  Block: TimelineBlock,
});
