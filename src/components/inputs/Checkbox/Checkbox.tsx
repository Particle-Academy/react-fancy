import { forwardRef, useEffect, useId, useRef } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { useFieldMode } from "../mode/FieldMode.context";
import { useInlineEdit } from "../mode/useInlineEdit";
import { dirtyRingClasses, ERROR_TEXT, fieldAria } from "../inputs.utils";
import type { CheckboxProps } from "./Checkbox.types";

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
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
      indeterminate,
      mode,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const checkboxId = id ?? autoId;
    const internalRef = useRef<HTMLInputElement | null>(null);
    const { errorId, descriptionId, aria } = fieldAria(checkboxId, { error, description });
    const resolvedMode = useFieldMode(mode);
    const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);
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

    const glyph = indeterminate ? "—" : checked ? "✓" : "✕";

    return (
      <div {...rest} data-react-fancy-checkbox="" className={cn("flex items-start gap-2", className)}>
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
              "flex shrink-0 items-center justify-center text-zinc-700 dark:text-zinc-200",
              sizeClasses,
              interactive &&
                "cursor-pointer rounded outline-none transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:text-white",
            )}
            aria-hidden={interactive ? undefined : "true"}
          >
            {glyph}
          </span>
        ) : (
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
            {...aria}
            autoFocus={interactive}
            onBlur={() => {
              if (interactive) exitEdit();
            }}
            onChange={(e) => setChecked(e.target.checked)}
            className={cn(
              sizeClasses,
              // A native checkbox: the browser draws the box and ignores author
              // borders (6.15.1) and backgrounds (6.17.0), so neither is set.
              // The kit themes what the browser exposes: the checked colour
              // (`accent-color`, the `--fancy-accent` token since 6.18.0) and, in
              // dark mode, a dark-scheme box.
              "cursor-pointer rounded accent-[color:var(--fancy-accent,var(--color-blue-600))] dark:accent-[color:var(--fancy-accent-dark,var(--color-blue-500))] transition-[box-shadow] duration-150 focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:[color-scheme:dark]",
              dirtyRingClasses(dirty),
            )}
          />
        </div>
        )}
        {/* `error` alone renders too: an unlabelled checkbox's error used to be dropped. */}
        {(label || description || error) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  "cursor-pointer text-sm text-zinc-700 dark:text-zinc-100",
                  disabled && "cursor-not-allowed opacity-50",
                  // Still names the input for assistive tech; drawn nowhere.
                  labelHidden && "sr-only",
                )}
              >
                {label}
                {required && <span className={cn("ms-0.5", ERROR_TEXT)}>*</span>}
              </label>
            )}
            {description && (
              <span id={descriptionId} className="text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
                {description}
              </span>
            )}
            {error && (
              <span id={errorId} role="alert" data-react-fancy-field-error="" className={cn("text-xs", ERROR_TEXT)}>
                {error}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
