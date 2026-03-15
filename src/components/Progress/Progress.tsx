import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { ProgressProps } from "./Progress.types";

const barHeightClasses: Record<NonNullable<ProgressProps["size"]>, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const circularSizeMap: Record<NonNullable<ProgressProps["size"]>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

const colorClasses: Record<NonNullable<ProgressProps["color"]>, string> = {
  blue: "bg-blue-500 dark:bg-blue-400",
  green: "bg-green-500 dark:bg-green-400",
  amber: "bg-amber-500 dark:bg-amber-400",
  red: "bg-red-500 dark:bg-red-400",
  violet: "bg-violet-500 dark:bg-violet-400",
  zinc: "bg-zinc-500 dark:bg-zinc-400",
};

const strokeColorClasses: Record<NonNullable<ProgressProps["color"]>, string> = {
  blue: "stroke-blue-500 dark:stroke-blue-400",
  green: "stroke-green-500 dark:stroke-green-400",
  amber: "stroke-amber-500 dark:stroke-amber-400",
  red: "stroke-red-500 dark:stroke-red-400",
  violet: "stroke-violet-500 dark:stroke-violet-400",
  zinc: "stroke-zinc-500 dark:stroke-zinc-400",
};

const textColorClasses: Record<NonNullable<ProgressProps["color"]>, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
  violet: "text-violet-600 dark:text-violet-400",
  zinc: "text-zinc-600 dark:text-zinc-400",
};

const textSizeClasses: Record<NonNullable<ProgressProps["size"]>, string> = {
  sm: "text-[8px]",
  md: "text-[10px]",
  lg: "text-xs",
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value = 0,
      max = 100,
      variant = "bar",
      size = "md",
      color = "blue",
      indeterminate = false,
      showValue = false,
      className,
    },
    ref,
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    if (variant === "circular") {
      const diameter = circularSizeMap[size];
      const strokeWidth = size === "sm" ? 3 : size === "md" ? 4 : 5;
      const radius = (diameter - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const offset = indeterminate ? circumference * 0.75 : circumference - (percentage / 100) * circumference;

      return (
        <div
          ref={ref}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={max}
          data-react-fancy-progress=""
          className={cn("relative inline-flex items-center justify-center", className)}
          style={{ width: diameter, height: diameter }}
        >
          <svg
            width={diameter}
            height={diameter}
            className={cn(indeterminate && "animate-spin")}
          >
            <circle
              cx={diameter / 2}
              cy={diameter / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className="stroke-zinc-200 dark:stroke-zinc-700"
            />
            <circle
              cx={diameter / 2}
              cy={diameter / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(strokeColorClasses[color], "transition-[stroke-dashoffset] duration-300")}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>
          {showValue && !indeterminate && (
            <span
              className={cn(
                "absolute font-medium",
                textColorClasses[color],
                textSizeClasses[size],
              )}
            >
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        data-react-fancy-progress=""
        className={cn("relative w-full", className)}
      >
        <div
          className={cn(
            "w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700",
            barHeightClasses[size],
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              colorClasses[color],
              indeterminate && "animate-pulse w-full",
            )}
            style={indeterminate ? undefined : { width: `${percentage}%` }}
          />
        </div>
        {showValue && !indeterminate && (
          <span
            className={cn(
              "mt-1 block text-right text-xs font-medium",
              textColorClasses[color],
            )}
          >
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  },
);

Progress.displayName = "Progress";
