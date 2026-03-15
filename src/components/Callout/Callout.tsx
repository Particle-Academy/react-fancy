import { forwardRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import type { CalloutProps } from "./Callout.types";

const colorClasses: Record<NonNullable<CalloutProps["color"]>, string> = {
  blue: "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-100",
  green: "border-green-500 bg-green-50 text-green-900 dark:border-green-400 dark:bg-green-950/50 dark:text-green-100",
  amber: "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/50 dark:text-amber-100",
  red: "border-red-500 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-950/50 dark:text-red-100",
  zinc: "border-zinc-500 bg-zinc-50 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-100",
};

const iconColorClasses: Record<NonNullable<CalloutProps["color"]>, string> = {
  blue: "text-blue-500 dark:text-blue-400",
  green: "text-green-500 dark:text-green-400",
  amber: "text-amber-500 dark:text-amber-400",
  red: "text-red-500 dark:text-red-400",
  zinc: "text-zinc-500 dark:text-zinc-400",
};

export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  (
    {
      children,
      color = "blue",
      icon,
      dismissible = false,
      onDismiss,
      className,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        role="alert"
        data-react-fancy-callout=""
        className={cn(
          "flex items-start gap-3 rounded-lg border-l-4 p-4",
          colorClasses[color],
          className,
        )}
      >
        {icon && (
          <span className={cn("mt-0.5 shrink-0", iconColorClasses[color])}>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">{children}</div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current",
            )}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  },
);

Callout.displayName = "Callout";
