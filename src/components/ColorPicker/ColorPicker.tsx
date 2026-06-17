import { forwardRef, useId, useRef } from "react";
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

    const inputRef = useRef<HTMLInputElement>(null);
    const datalistId = useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setColor(e.target.value);
    };

    const handleSwatchClick = () => {
      if (!disabled) {
        inputRef.current?.click();
      }
    };

    if (!showControl) {
      return (
        <div
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
            aria-label={`Color: ${color}`}
          />
          <span
            className={cn(
              "select-all font-mono uppercase",
              TEXT_SIZES[size],
              "text-zinc-700 dark:text-zinc-300",
            )}
          >
            {color.toUpperCase()}
          </span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-react-fancy-color-picker=""
        className={cn("inline-flex items-center gap-2", className)}
        onBlur={(e) => {
          if (interactive && !e.currentTarget.contains(e.relatedTarget as Node)) exitEdit();
        }}
      >
        <button
          type="button"
          disabled={disabled}
          autoFocus={interactive}
          onClick={handleSwatchClick}
          className={cn(
            "relative shrink-0 rounded-full transition-shadow",
            SWATCH_SIZES[size],
            variant === "outline" &&
              "ring-1 ring-zinc-300 dark:ring-zinc-600",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:ring-2 hover:ring-zinc-400 dark:hover:ring-zinc-500",
          )}
          style={{ backgroundColor: color }}
          aria-label={`Selected color: ${color}`}
        >
          <input
            ref={inputRef}
            type="color"
            value={color}
            onChange={handleChange}
            disabled={disabled}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            tabIndex={-1}
            list={presets ? datalistId : undefined}
          />
        </button>

        <span
          className={cn(
            "select-all font-mono uppercase",
            TEXT_SIZES[size],
            "text-zinc-700 dark:text-zinc-300",
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
