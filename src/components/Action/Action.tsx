import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { ActionProps } from "./Action.types";

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
  (
    {
      children,
      className,
      color = "zinc",
      size = "md",
      variant = "solid",
      icon,
      iconTrailing,
      loading = false,
      disabled,
      href,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
      "disabled:opacity-50 disabled:pointer-events-none",
      {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-5 py-2.5 text-base",
        xl: "px-6 py-3 text-lg",
      }[size],
      className,
    );

    if (href && !disabled) {
      return (
        <a href={href} className={classes}>
          {icon}
          {children}
          {iconTrailing}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          icon
        )}
        {children}
        {iconTrailing}
      </button>
    );
  },
);

Action.displayName = "Action";
