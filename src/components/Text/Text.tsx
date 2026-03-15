import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { TextProps } from "./Text.types";

const sizeClasses: Record<NonNullable<TextProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

const weightClasses: Record<NonNullable<TextProps["weight"]>, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const colorClasses: Record<NonNullable<TextProps["color"]>, string> = {
  default: "text-zinc-900 dark:text-zinc-100",
  muted: "text-zinc-500 dark:text-zinc-400",
  accent: "text-blue-600 dark:text-blue-400",
  danger: "text-red-600 dark:text-red-400",
  success: "text-emerald-600 dark:text-emerald-400",
};

export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      as: Tag = "p",
      size = "md",
      weight = "normal",
      color = "default",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Tag
        ref={ref as React.Ref<never>}
        data-react-fancy-text=""
        className={cn(
          sizeClasses[size],
          weightClasses[weight],
          colorClasses[color],
          className,
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  },
);

Text.displayName = "Text";
