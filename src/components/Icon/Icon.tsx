import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { resolveIcon } from "./icon-config";
import type { IconProps } from "./Icon.types";

const sizeClasses: Record<NonNullable<IconProps["size"]>, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

const sizePixels: Record<NonNullable<IconProps["size"]>, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ size = "md", className, children, name, iconSet, ...props }, ref) => {
    let content = children;

    if (name && !children) {
      const ResolvedIcon = resolveIcon(name, iconSet);
      if (ResolvedIcon) {
        content = <ResolvedIcon size={sizePixels[size]} />;
      }
    }

    return (
      <span
        ref={ref}
        aria-hidden="true"
        data-react-fancy-icon=""
        className={cn(
          "inline-flex items-center justify-center flex-shrink-0",
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {content}
      </span>
    );
  },
);

Icon.displayName = "Icon";
