import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { useFieldMode } from "../mode/FieldMode.context";
import { useInlineEdit } from "../mode/useInlineEdit";
import { dirtyRingClasses } from "../inputs.utils";
import type { SwitchProps } from "./Switch.types";
import { switchTrack } from "./Switch.colors";

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      size = "md",
      dirty,
      error,
      label,
      labelHidden,
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
      mode,
      ...rest
    },
    ref,
  ) => {
    // `aria-*` names and describes the CONTROL, so it goes on the role="switch"
    // button; everything else (className, style, data-*, handlers) stays on the
    // wrapper, where it has always gone. On the wrapper, an `aria-label` named a
    // div and left the switch itself unnamed.
    const wrapperProps: Record<string, unknown> = {};
    const controlAria: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith("aria-")) controlAria[key] = value;
      else wrapperProps[key] = value;
    }

    const autoId = useId();
    const switchId = id ?? autoId;
    const resolvedMode = useFieldMode(mode);
    const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);
    const [checked, setChecked] = useControllableState(
      controlledChecked,
      defaultChecked,
      onCheckedChange,
    );

    const trackSizes = {
      xs: "h-3.5 w-6",
      sm: "h-4 w-7",
      md: "h-5 w-9",
      lg: "h-6 w-11",
      xl: "h-7 w-[52px]",
    }[size];

    const knobSizes = {
      xs: "h-2.5 w-2.5",
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
      xl: "h-6 w-6",
    }[size];

    const translateOn = {
      xs: "translate-x-2.5",
      sm: "translate-x-3",
      md: "translate-x-4",
      lg: "translate-x-5",
      xl: "translate-x-6",
    }[size];

    return (
      <div
        {...wrapperProps}
        // View mode has no switch to name, so its aria-* stay on the wrapper.
        {...(showControl ? undefined : controlAria)}
        data-react-fancy-switch="" className={cn("flex items-start gap-2", className)}>
        {!showControl ? (
          <span
            data-react-fancy-display=""
            data-mode="view"
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            title={interactive ? "Click to edit" : undefined}
            onClick={interactive ? enterEdit : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      enterEdit();
                    }
                  }
                : undefined
            }
            className={cn(
              "text-sm font-medium text-zinc-700 dark:text-zinc-200",
              interactive &&
                "cursor-pointer rounded-md outline-none transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:text-white",
            )}
          >
            {checked ? "On" : "Off"}
          </span>
        ) : (
        <button
          {...controlAria}
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          autoFocus={interactive}
          onBlur={() => {
            if (interactive) exitEdit();
          }}
          onClick={() => setChecked(!checked)}
          className={cn(
            "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            trackSizes,
            // The unchecked track is the `border` role ("tracks"). The dark
            // fallback stays zinc-600, today's colour, not the role's zinc-700
            // default — set nothing, see no change.
            checked
              ? switchTrack[color]
              : "bg-[color:var(--fancy-border,var(--color-zinc-200))] dark:bg-[color:var(--fancy-border-dark,var(--color-zinc-600))]",
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
        )}
        {name && (
          <input type="hidden" name={name} value={checked ? "1" : "0"} />
        )}
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  "cursor-pointer text-sm text-zinc-700 dark:text-zinc-100",
                  disabled && "cursor-not-allowed opacity-50",
                  // Not drawn, still the accessible name (it labels the button).
                  labelHidden && "sr-only",
                )}
              >
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
            )}
            {description && (
              <span className="text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
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
