import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Field } from "../Field";
import { dirtyRingClasses } from "../inputs.utils";
import type { SliderProps } from "./Slider.types";

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (props, ref) => {
    const {
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
      min = 0,
      max = 100,
      step = 1,
      showValue,
      marks,
    } = props;

    const autoId = useId();
    const sliderId = id ?? autoId;

    if (props.range) {
      return (
        <RangeSlider
          {...props}
          id={sliderId}
          ref={ref}
        />
      );
    }

    return (
      <SingleSlider
        {...props}
        range={false}
        id={sliderId}
        ref={ref}
      />
    );
  },
);

Slider.displayName = "Slider";

const SingleSlider = forwardRef<HTMLInputElement, SliderProps & { range?: false }>(
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
      min = 0,
      max = 100,
      step = 1,
      showValue,
      marks,
      prefix,
      suffix,
      ...rest
    },
    ref,
  ) => {
    const singleProps = rest as { value?: number; defaultValue?: number; onValueChange?: (v: number) => void };
    const [value, setValue] = useControllableState(
      singleProps.value,
      singleProps.defaultValue ?? min,
      singleProps.onValueChange,
    );

    const slider = (
      <div data-react-fancy-slider="" className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-3">
          <input
            ref={ref}
            id={id}
            type="range"
            name={name}
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(Number(e.target.value))}
            className={cn(
              "w-full cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50",
              dirtyRingClasses(dirty),
              {
                xs: "h-1",
                sm: "h-1.5",
                md: "h-2",
                lg: "h-2.5",
                xl: "h-3",
              }[size],
            )}
          />
          {showValue && (
            <span className="min-w-[3ch] shrink-0 whitespace-nowrap text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {prefix}{value}{suffix}
            </span>
          )}
        </div>
        {marks && marks.length > 0 && <SliderMarks marks={marks} min={min} max={max} />}
      </div>
    );

    if (label || error || description) {
      return (
        <Field label={label} description={description} error={error} required={required} htmlFor={id} size={size}>
          {slider}
        </Field>
      );
    }

    return slider;
  },
);

SingleSlider.displayName = "SingleSlider";

const RangeSlider = forwardRef<HTMLInputElement, SliderProps & { range: true }>(
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
      min = 0,
      max = 100,
      step = 1,
      showValue,
      marks,
      prefix,
      suffix,
      ...rest
    },
    ref,
  ) => {
    const rangeProps = rest as { value?: [number, number]; defaultValue?: [number, number]; onValueChange?: (v: [number, number]) => void };
    const [value, setValue] = useControllableState(
      rangeProps.value,
      rangeProps.defaultValue ?? [min, max] as [number, number],
      rangeProps.onValueChange,
    );

    const handleMin = (n: number) => {
      setValue([Math.min(n, value[1]), value[1]]);
    };

    const handleMax = (n: number) => {
      setValue([value[0], Math.max(n, value[0])]);
    };

    const leftPercent = ((value[0] - min) / (max - min)) * 100;
    const rightPercent = ((value[1] - min) / (max - min)) * 100;

    const slider = (
      <div data-react-fancy-slider="" className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-3">
          <div className="relative w-full">
            <div className="pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div
              className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-500"
              style={{ left: `${leftPercent}%`, width: `${rightPercent - leftPercent}%` }}
            />
            <input
              ref={ref}
              type="range"
              min={min}
              max={max}
              step={step}
              value={value[0]}
              disabled={disabled}
              onChange={(e) => handleMin(Number(e.target.value))}
              className={cn(
                "pointer-events-none absolute w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow",
                dirtyRingClasses(dirty),
              )}
            />
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value[1]}
              disabled={disabled}
              onChange={(e) => handleMax(Number(e.target.value))}
              className="pointer-events-none absolute w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow"
            />
            <div className="h-6" />
          </div>
          {showValue && (
            <span className="min-w-[6ch] shrink-0 whitespace-nowrap text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {prefix}{value[0]}{suffix}–{prefix}{value[1]}{suffix}
            </span>
          )}
        </div>
        {marks && marks.length > 0 && <SliderMarks marks={marks} min={min} max={max} />}
      </div>
    );

    if (label || error || description) {
      return (
        <Field label={label} description={description} error={error} required={required} htmlFor={id} size={size}>
          {slider}
        </Field>
      );
    }

    return slider;
  },
);

RangeSlider.displayName = "RangeSlider";

function SliderMarks({
  marks,
  min,
  max,
}: {
  marks: { value: number; label?: string }[];
  min: number;
  max: number;
}) {
  return (
    <div className="relative h-5 w-full">
      {marks.map((mark) => {
        const percent = ((mark.value - min) / (max - min)) * 100;
        return (
          <span
            key={mark.value}
            className="absolute -translate-x-1/2 text-xs text-zinc-500 dark:text-zinc-400"
            style={{ left: `${percent}%` }}
          >
            {mark.label ?? mark.value}
          </span>
        );
      })}
    </div>
  );
}
