import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { BrandProps } from "./Brand.types";

const gapClasses: Record<NonNullable<BrandProps["size"]>, string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const nameClasses: Record<NonNullable<BrandProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

const taglineClasses: Record<NonNullable<BrandProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export const Brand = forwardRef<HTMLDivElement, BrandProps>(
  ({ logo, name, tagline, size = "md", className }, ref) => {
    return (
      <div
        ref={ref}
        data-react-fancy-brand=""
        className={cn("flex items-center", gapClasses[size], className)}
      >
        {logo && <div className="shrink-0">{logo}</div>}
        {(name || tagline) && (
          <div className="flex min-w-0 flex-col">
            {name && (
              <span
                className={cn(
                  "truncate font-bold text-zinc-900 dark:text-zinc-100",
                  nameClasses[size],
                )}
              >
                {name}
              </span>
            )}
            {tagline && (
              <span
                className={cn(
                  "truncate text-zinc-500 dark:text-zinc-400",
                  taglineClasses[size],
                )}
              >
                {tagline}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

Brand.displayName = "Brand";
