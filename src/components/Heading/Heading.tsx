import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { HeadingProps } from "./Heading.types";

const sizeClasses: Record<NonNullable<HeadingProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
  "2xl": "text-4xl",
  // Display steps. Each is the next Tailwind size up, continuing the ramp.
  "3xl": "text-5xl",
  "4xl": "text-6xl",
  "5xl": "text-7xl",
  "6xl": "text-8xl",
  "7xl": "text-9xl",
};

/**
 * Tracking for the display steps only.
 *
 * Default letter-spacing is tuned for headings that sit near body text. At
 * display scale the same spacing reads loose — which is exactly why the big-type
 * gallery style hand-rolled its own `<h1>` rather than use this component.
 */
const trackingClasses: Partial<Record<NonNullable<HeadingProps["size"]>, string>> = {
  "3xl": "tracking-tight",
  "4xl": "tracking-tight",
  "5xl": "tracking-tighter",
  "6xl": "tracking-tighter",
  "7xl": "tracking-tighter",
};

const weightClasses: Record<NonNullable<HeadingProps["weight"]>, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    {
      as: Tag = "h2",
      size = "lg",
      weight = "bold",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Tag
        ref={ref}
        data-react-fancy-heading=""
        className={cn(
          "text-zinc-900 dark:text-zinc-100",
          sizeClasses[size],
          trackingClasses[size],
          weightClasses[weight],
          className,
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  },
);

Heading.displayName = "Heading";
