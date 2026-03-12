import { forwardRef, useEffect, useId, useRef } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { dirtyRingClasses } from "../inputs.utils";
import type { CheckboxProps } from "./Checkbox.types";

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      size = "md",
      dirty,
      error,
      label,
      description,
      required,
      disabled,
      className,
      id,
      name,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      indeterminate,
    },
    ref,
  ) => {
    const autoId = useId();
    const checkboxId = id ?? autoId;
    const internalRef = useRef<HTMLInputElement | null>(null);
    const [checked, setChecked] = useControllableState(
      controlledChecked,
      defaultChecked,
      onCheckedChange,
    );

    useEffect(() => {
      const el = internalRef.current;
      if (el) {
        el.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate]);

    const sizeClasses = {
      xs: "h-3.5 w-3.5",
      sm: "h-4 w-4",
      md: "h-[18px] w-[18px]",
      lg: "h-5 w-5",
      xl: "h-6 w-6",
    }[size];

    return (
      <div className={cn("flex items-start gap-2", className)}>
        <div className="relative flex items-center">
          <input
            ref={(node) => {
              internalRef.current = node;
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            id={checkboxId}
            type="checkbox"
            name={name}
            disabled={disabled}
            required={required}
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className={cn(
              sizeClasses,
              "cursor-pointer rounded border border-zinc-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800",
              dirtyRingClasses(dirty),
              error && "border-red-500",
            )}
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  "cursor-pointer text-sm text-zinc-700 dark:text-zinc-300",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
            )}
            {description && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {description}
              </span>
            )}
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
