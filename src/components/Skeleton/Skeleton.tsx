import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { SkeletonProps } from "./Skeleton.types";

function toStyleValue(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ shape = "rect", width, height, className }, ref) => {
    const style: React.CSSProperties = {
      width: toStyleValue(width),
      height: toStyleValue(height),
    };

    return (
      <div
        ref={ref}
        aria-hidden="true"
        data-react-fancy-skeleton=""
        className={cn(
          "animate-pulse bg-zinc-200 dark:bg-zinc-700",
          shape === "rect" && "rounded-lg",
          shape === "circle" && "rounded-full aspect-square",
          shape === "text" && "rounded h-4 w-full",
          className,
        )}
        style={style}
      />
    );
  },
);

Skeleton.displayName = "Skeleton";
