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
