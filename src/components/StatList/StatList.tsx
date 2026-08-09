import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { StatListProps } from "./StatList.types";

/**
 * The mono figure stack — `70 packages / 261 components / MIT licensed`.
 *
 * The Inspiration index and `/packages` each hand-rolled this from tokens, which
 * is the gallery working as intended: it stress-tests the kit, and what it
 * hand-rolls is the gap list. The list only pays off when the gap comes back
 * here, otherwise every surface keeps a copy and they drift apart.
 *
 * Takes `items` as DATA rather than children. What those surfaces repeat is a
 * shape, not a layout, so there is nothing to assemble at the call site — and a
 * data prop is what an agent can emit, which children are not.
 *
 * The value is a `<b>` rather than a colour, because in most of these stacks the
 * figure is the only part that is not muted, and expressing that structurally
 * keeps it meaningful when a design replaces the styling wholesale.
 */
export const StatList = forwardRef<HTMLDivElement, StatListProps>(
  ({ items, align = "right", className, ...props }, ref) => {
    if (items.length === 0) return null;

    return (
      <div
        ref={ref}
        {...props}
        data-react-fancy-stat-list=""
        data-align={align}
        className={cn(
          "flex flex-col gap-0.5 font-mono text-[11.5px] text-zinc-500 dark:text-zinc-400",
          align === "right" ? "items-end text-right" : "items-start text-left",
          className,
        )}
      >
        {items.map((item, i) => (
          <span
            key={item.key ?? (typeof item.label === "string" ? item.label : i)}
            data-stat={item.key ?? (typeof item.label === "string" ? item.label : undefined)}
          >
            <b className="font-medium text-zinc-900 dark:text-zinc-100">{item.value}</b>{" "}
            {item.label}
          </span>
        ))}
      </div>
    );
  },
);

StatList.displayName = "StatList";
