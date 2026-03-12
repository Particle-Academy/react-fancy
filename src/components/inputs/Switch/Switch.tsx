import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { dirtyRingClasses } from "../inputs.utils";
import type { SwitchProps } from "./Switch.types";

const trackColorMap: Record<string, string> = {
  zinc: "bg-zinc-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
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
      color = "blue",
    },
    ref,
  ) => {
    const autoId = useId();
    const switchId = id ?? autoId;
    const [checked, setChecked] = useControllableState(
      controlledChecked,
      defaultChecked,
      onCheckedChange,
    );

    const trackSizes = {
      xs: "h-4 w-7",
      sm: "h-5 w-9",
      md: "h-6 w-11",
      lg: "h-7 w-[52px]",
      xl: "h-8 w-[60px]",
    }[size];

    const knobSizes = {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-7 w-7",
    }[size];

    const translateOn = {
      xs: "translate-x-3",
      sm: "translate-x-4",
      md: "translate-x-5",
      lg: "translate-x-6",
      xl: "translate-x-7",
    }[size];

    return (
      <div className={cn("flex items-start gap-2", className)}>
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => setChecked(!checked)}
          className={cn(
            "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            trackSizes,
            checked ? trackColorMap[color] : "bg-zinc-200 dark:bg-zinc-700",
            dirtyRingClasses(dirty),
            error && "ring-2 ring-red-500/50",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block rounded-full bg-white shadow-sm transition-transform",
              knobSizes,
              checked ? translateOn : "translate-x-0",
            )}
          />
        </button>
        {name && (
          <input type="hidden" name={name} value={checked ? "1" : "0"} />
        )}
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={switchId}
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

Switch.displayName = "Switch";
