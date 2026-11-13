import { forwardRef, useId } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useFieldMode } from "../inputs/mode/FieldMode.context";
import { useInlineEdit } from "../inputs/mode/useInlineEdit";
import type { ColorPickerProps } from "./ColorPicker.types";

const DEFAULT_COLOR = "#3b82f6";

const SWATCH_SIZES = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

const TEXT_SIZES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const;

export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
  (
    {
      value,
      defaultValue = DEFAULT_COLOR,
      onChange,
      presets,
      size = "md",
      variant = "outline",
      disabled = false,
      className,
      mode,
      label = "Color",
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      ...rest
    },
    ref,
  ) => {
    const [color, setColor] = useControllableState(
      value,
      defaultValue,
      onChange,
    );
    const resolvedMode = useFieldMode(mode);
    const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);

    const datalistId = useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setColor(e.target.value);
    };

    if (!showControl) {
      return (
        <div
          {...rest}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          ref={ref}
          data-react-fancy-color-picker=""
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
            "inline-flex items-center gap-2",
            interactive &&
              "cursor-pointer rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-500/40",
            className,
          )}
        >
          <span
            className={cn(
              "shrink-0 rounded-full",
              SWATCH_SIZES[size],
              variant === "outline" && "ring-1 ring-zinc-300 dark:ring-zinc-600",
            )}
            style={{ backgroundColor: color }}
            role="img"
            aria-label={`${ariaLabel ?? label}: ${color}`}
          />
          <span
            className={cn(
              "select-all font-mono uppercase",
              TEXT_SIZES[size],
              "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]",
            )}
          >
            {color.toUpperCase()}
          </span>
        </div>
      );
    }

    return (
      <div
        {...rest}
        ref={ref}
        data-react-fancy-color-picker=""
        className={cn("inline-flex items-center gap-2", className)}
        onBlur={(e) => {
          if (interactive && !e.currentTarget.contains(e.relatedTarget as Node)) exitEdit();
        }}
      >
        {/*
          The swatch is paint, not a control: the native colour input inside it
          is the one control, the tab stop and the thing that is named. Up to
          6.25.0 the swatch was a <button> wrapping the input (axe
          `nested-interactive`), and the input had no name (axe `label`): an
          `aria-label` on the root named neither.
        */}
        <span
          data-react-fancy-color-picker-swatch=""
          className={cn(
            "relative shrink-0 rounded-full transition-shadow",
            SWATCH_SIZES[size],
            // The ring is the swatch's boundary whatever colour it holds, so it
            // reads `border-strong` (6.15.0, WCAG 1.4.11); the hover is a step
            // past it.
            variant === "outline" &&
              "ring-1 ring-[color:var(--fancy-border-strong,var(--color-zinc-500))] dark:ring-[color:var(--fancy-border-strong-dark,var(--color-zinc-500))]",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:ring-2 hover:ring-zinc-600 dark:hover:ring-zinc-400",
            // The input is invisible, so its focus shows on the swatch.
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-[color:var(--fancy-focus,var(--color-blue-500))] dark:has-[:focus-visible]:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]",
          )}
          style={{ backgroundColor: color }}
        >
          <input
            type="color"
            value={color}
            onChange={handleChange}
            disabled={disabled}
            autoFocus={interactive}
            aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? label)}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            className={cn(
              "absolute inset-0 h-full w-full rounded-full opacity-0 outline-none",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
            )}
            list={presets ? datalistId : undefined}
          />
        </span>

        <span
          className={cn(
            "select-all font-mono uppercase",
            TEXT_SIZES[size],
            "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]",
            disabled && "opacity-50",
          )}
        >
          {color.toUpperCase()}
        </span>

        {presets && (
          <datalist id={datalistId}>
            {presets.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
        )}
      </div>
    );
  },
);

ColorPicker.displayName = "ColorPicker";
