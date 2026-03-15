import { forwardRef, useId, useRef } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
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
    },
    ref,
  ) => {
    const [color, setColor] = useControllableState(
      value,
      defaultValue,
      onChange,
    );

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

    return (
      <div
        ref={ref}
        data-react-fancy-color-picker=""
        className={cn("inline-flex items-center gap-2", className)}
      >
        <button
          type="button"
          disabled={disabled}
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
