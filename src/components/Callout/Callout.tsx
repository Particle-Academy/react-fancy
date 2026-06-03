import { forwardRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import type { CalloutProps } from "./Callout.types";
import { calloutContainer, calloutIcon } from "./Callout.colors";

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
          calloutContainer[color],
          className,
        )}
      >
        {icon && (
          <span className={cn("mt-0.5 shrink-0", calloutIcon[color])}>
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
