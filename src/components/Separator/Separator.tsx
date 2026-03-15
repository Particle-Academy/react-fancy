import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { SeparatorProps } from "./Separator.types";

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = "horizontal", label, className }, ref) => {
    if (orientation === "vertical") {
      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation="vertical"
          data-react-fancy-separator=""
          className={cn(
            "inline-block h-full border-l border-zinc-200 dark:border-zinc-700",
            className,
          )}
        />
      );
    }

    if (label) {
      return (
        <div
          ref={ref}
          role="separator"
          data-react-fancy-separator=""
          className={cn("flex items-center gap-3", className)}
        >
          <hr className="flex-1 border-zinc-200 dark:border-zinc-700" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {label}
          </span>
          <hr className="flex-1 border-zinc-200 dark:border-zinc-700" />
        </div>
      );
    }

    return (
      <hr
        ref={ref as React.Ref<HTMLHRElement>}
        role="separator"
        data-react-fancy-separator=""
        className={cn(
          "border-zinc-200 dark:border-zinc-700",
          className,
        )}
      />
    );
  },
);

Separator.displayName = "Separator";
