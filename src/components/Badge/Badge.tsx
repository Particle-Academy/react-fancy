import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { BadgeProps } from "./Badge.types";

type BadgeColor = NonNullable<BadgeProps["color"]>;
type BadgeVariant = NonNullable<BadgeProps["variant"]>;
type BadgeSize = NonNullable<BadgeProps["size"]>;

const solidClasses: Record<BadgeColor, string> = {
  zinc: "bg-zinc-600 text-white dark:bg-zinc-500",
  red: "bg-red-600 text-white dark:bg-red-500",
  blue: "bg-blue-600 text-white dark:bg-blue-500",
  green: "bg-green-600 text-white dark:bg-green-500",
  amber: "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950",
  violet: "bg-violet-600 text-white dark:bg-violet-500",
  rose: "bg-rose-600 text-white dark:bg-rose-500",
};

const outlineClasses: Record<BadgeColor, string> = {
  zinc: "border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300",
  red: "border border-red-300 text-red-700 dark:border-red-600 dark:text-red-300",
  blue: "border border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300",
  green: "border border-green-300 text-green-700 dark:border-green-600 dark:text-green-300",
  amber: "border border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300",
  violet: "border border-violet-300 text-violet-700 dark:border-violet-600 dark:text-violet-300",
  rose: "border border-rose-300 text-rose-700 dark:border-rose-600 dark:text-rose-300",
};

const softClasses: Record<BadgeColor, string> = {
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const variantMap: Record<BadgeVariant, Record<BadgeColor, string>> = {
  solid: solidClasses,
  outline: outlineClasses,
  soft: softClasses,
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-0.5",
  lg: "text-base px-2.5 py-1",
};

const dotColorClasses: Record<BadgeColor, string> = {
  zinc: "bg-zinc-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      color = "zinc",
      variant = "soft",
      size = "md",
      dot = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        data-react-fancy-badge=""
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium",
          sizeClasses[size],
          variantMap[variant][color],
          className,
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              dotColorClasses[color],
            )}
          />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";
