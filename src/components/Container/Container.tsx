import { forwardRef } from "react";
import type * as React from "react";
import { cn } from "../../utils/cn";
import type { ContainerProps } from "./Container.types";

const SIZES = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  full: "max-w-none",
} as const;

/**
 * The page's horizontal measure — centred, capped, with gutters.
 *
 * Every Swiss-family gallery style hand-rolled this. What they repeated was not
 * `mx-auto` but the DECISION about how wide the page reads, and twenty copies of
 * a decision drift. This owns the decision and leaves the styling replaceable.
 */
export const Container = forwardRef<HTMLElement, ContainerProps>(
  ({ children, size = "md", as: Tag = "div", className, ...props }, ref) => {
    // `as` makes the element dynamic, so the ref type cannot be known
    // statically. Narrowed at the boundary rather than dragging a full
    // polymorphic-component generic into a layout primitive.
    const Component = Tag as "div";

    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement>}
        {...props}
        data-react-fancy-container=""
        data-size={size}
        className={cn("mx-auto w-full px-4 sm:px-6", SIZES[size], className)}
      >
        {children}
      </Component>
    );
  },
);

Container.displayName = "Container";
