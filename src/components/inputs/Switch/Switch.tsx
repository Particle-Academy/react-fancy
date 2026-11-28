import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { useFieldMode } from "../mode/FieldMode.context";
import { useInlineEdit } from "../mode/useInlineEdit";
import { dirtyRingClasses, ERROR_TEXT } from "../inputs.utils";
import type { SwitchProps } from "./Switch.types";
import { switchTrack } from "./Switch.colors";

// No `color`: the checked track reads the kit accent. Its fallback is the
// blue-500 the default `color="blue"` painted, in BOTH modes, so a host that
// sets nothing sees no change (the accent's own defaults are blue-600 / 500).
const SWITCH_ACCENT_TRACK =
  "bg-[color:var(--fancy-accent,var(--color-blue-500))] dark:bg-[color:var(--fancy-accent-dark,var(--color-blue-500))]";

// The focus ring reads the focus token first, like every other form control,
// then the accent, then the blue-500/40 it always was. So a host that sets only
// `--fancy-accent` gets an accent ring; one that sets `--fancy-focus` gets the
// same ring as its inputs.
const SWITCH_FOCUS_RING =
  "focus-visible:ring-[color:var(--fancy-focus,var(--fancy-accent,var(--color-blue-500)))]/40 dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--fancy-accent-dark,var(--color-blue-500)))]/40";

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
      color,
      mode,
      ...rest
    },
    ref,
  ) => {
    // `aria-*` names and describes the CONTROL, and a `data-*` handle has to
    // name the element that acts (component contract: stable handles), so both
    // go on the role="switch" button. On the wrapper, an `aria-label` named a
    // div and left the switch unnamed, and a `data-*` handle named a div that
    // ignores clicks. className, style and handlers stay on
    // the wrapper, where they have always gone.
    const wrapperProps: Record<string, unknown> = {};
    const controlAttrs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith("aria-") || key.startsWith("data-")) controlAttrs[key] = value;
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

    // On travels toward the inline END: rightward in LTR, leftward in RTL,
    // where the knob starts on the right.
    const translateOn = {
      xs: "translate-x-2.5 rtl:-translate-x-2.5",
      sm: "translate-x-3 rtl:-translate-x-3",
      md: "translate-x-4 rtl:-translate-x-4",
      lg: "translate-x-5 rtl:-translate-x-5",
      xl: "translate-x-6 rtl:-translate-x-6",
    }[size];

    return (
      <div
        {...wrapperProps}
        // View mode has no switch, so its aria-* and data-* stay on the wrapper.
        {...(showControl ? undefined : controlAttrs)}
        data-react-fancy-switch="" className={cn("relative flex items-start gap-2", className)}>
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
          {...controlAttrs}
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
            "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            SWITCH_FOCUS_RING,
            " disabled:cursor-not-allowed disabled:opacity-50",
            trackSizes,
            // The unchecked track's fill is the switch's only boundary, so it
            // reads `border-strong` (6.15.0, WCAG 1.4.11): zinc-500 in both
            // modes. It was the `border` role, zinc-200 / zinc-600.
            checked
              ? (color ? switchTrack[color] : SWITCH_ACCENT_TRACK)
              : "bg-[color:var(--fancy-border-strong,var(--color-zinc-500))] dark:bg-[color:var(--fancy-border-strong-dark,var(--color-zinc-500))]",
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
                {required && <span className={cn("ms-0.5", ERROR_TEXT)}>*</span>}
              </label>
            )}
            {description && (
              <span className="text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
                {description}
              </span>
            )}
            {error && <span className={cn("text-xs", ERROR_TEXT)}>{error}</span>}
          </div>
        )}
      </div>
    );
  },
);

Switch.displayName = "Switch";
