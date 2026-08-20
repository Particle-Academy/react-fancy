import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { ProgressProps } from "./Progress.types";
import { progressFill, progressStroke, progressText } from "./Progress.colors";

type NamedSize = "sm" | "md" | "lg";

const barHeightClasses: Record<NamedSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const circularSizeMap: Record<NamedSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

const namedStrokeWidth: Record<NamedSize, number> = { sm: 3, md: 4, lg: 5 };

const textSizeClasses: Record<NamedSize, string> = {
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
      strokeWidth: strokeWidthProp,
      color = "blue",
      indeterminate = false,
      showValue = false,
      className,
      trackClassName,
      fillClassName,
      ...rest
    },
    ref,
  ) => {
    // Class lookups need a named key; a pixel size sizes the ring itself and
    // leaves the type/bar scales on their default.
    const named: NamedSize = typeof size === "number" ? "md" : size;

    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    if (variant === "circular") {
      const pixelSize = typeof size === "number" ? size : null;
      const diameter = pixelSize ?? circularSizeMap[named];
      // Scale with the circle when not told otherwise: a 5px stroke on a 152px
      // ring reads as a hairline, so a fixed default makes large sizes look
      // broken out of the box. The named scale keeps its exact old values.
      const strokeWidth =
        strokeWidthProp ??
        (pixelSize === null ? namedStrokeWidth[named] : Math.max(3, Math.round(diameter * 0.075)));
      const radius = (diameter - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const offset = indeterminate ? circumference * 0.75 : circumference - (percentage / 100) * circumference;

      return (
        <div
          ref={ref}
          {...rest}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={max}
          data-react-fancy-progress=""
          // The named diameters live in styles.css keyed off this, so they work
          // without the consumer's Tailwind generating anything — and, being
          // layered, a className utility still beats them.
          data-size={pixelSize === null ? named : undefined}
          className={cn(
            "relative inline-flex items-center justify-center",
            className,
          )}
          style={pixelSize === null ? undefined : { width: pixelSize, height: pixelSize }}
        >
          <svg
            // viewBox + 100% so the geometry follows the box instead of being
            // baked in: the ring now scales with whatever sizes the wrapper,
            // including a `className` override of the named scale.
            viewBox={`0 0 ${diameter} ${diameter}`}
            width="100%"
            height="100%"
            className={cn(indeterminate && "animate-spin")}
          >
            <circle
              cx={diameter / 2}
              cy={diameter / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className={cn("stroke-zinc-200 dark:stroke-zinc-700", trackClassName)}
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
              className={cn(
                progressStroke[color],
                "transition-[stroke-dashoffset] duration-300",
                fillClassName,
              )}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>
          {showValue && !indeterminate && (
            <span
              className={cn(
                "absolute font-medium",
                progressText[color],
                textSizeClasses[named],
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
        {...rest}
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
            barHeightClasses[named],
            trackClassName,
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              progressFill[color],
              indeterminate && "animate-pulse w-full",
              fillClassName,
            )}
            style={indeterminate ? undefined : { width: `${percentage}%` }}
          />
        </div>
        {showValue && !indeterminate && (
          <span
            className={cn(
              "mt-1 block text-right text-xs font-medium",
              progressText[color],
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
