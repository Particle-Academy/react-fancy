import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Field } from "../Field";
import { resolveOption } from "../inputs.utils";
import type { Size } from "../../../utils/types";
import type { MultiSwitchProps } from "./MultiSwitch.types";

const sizeClasses: Record<Size, string> = {
  xs: "px-2 py-1 text-xs",
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
  xl: "px-5 py-3 text-lg",
};

export function MultiSwitch<V = string>({
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
  list,
  value: controlledValue,
  defaultValue,
  onValueChange,
  linear,
}: MultiSwitchProps<V>) {
  const resolvedOptions = list.map(resolveOption);
  const fallback = defaultValue ?? resolvedOptions[0]?.value;
  const [value, setValue] = useControllableState(controlledValue, fallback as V, onValueChange);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const selectedIndex = resolvedOptions.findIndex(
    (o) => o.value === value,
  );

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const activeItem = itemRefs.current[selectedIndex];
    if (!container || !activeItem) {
      setIndicator(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    setIndicator({
      left: itemRect.left - containerRect.left,
      width: itemRect.width,
    });
  }, [selectedIndex]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  const control = (
    <div
      ref={containerRef}
      data-react-fancy-multi-switch=""
      role="radiogroup"
      id={id}
      className={cn(
        "relative inline-flex rounded-lg border border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800",
        dirty && "ring-2 ring-amber-400/50",
        error && "ring-2 ring-red-500/50",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {indicator && (
        <span
          className="absolute top-0 bottom-0 rounded-lg bg-blue-600 transition-all duration-200 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {resolvedOptions.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(el) => { itemRefs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled || option.disabled}
            onClick={() => {
              if (linear) {
                const nextIndex = (selectedIndex + 1) % resolvedOptions.length;
                setValue(resolvedOptions[nextIndex].value as V);
              } else {
                setValue(option.value as V);
              }
            }}
            className={cn(
              "relative z-10 font-medium transition-colors duration-200",
              sizeClasses[size],
              isSelected
                ? "text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              (disabled || option.disabled) && "cursor-not-allowed",
            )}
          >
            {option.label}
          </button>
        );
      })}
      {name && <input type="hidden" name={name} value={String(value)} />}
    </div>
  );

  if (label || error || description) {
    return (
      <Field label={label} description={description} error={error} required={required} htmlFor={id} size={size}>
        {control}
      </Field>
    );
  }

  return control;
}

MultiSwitch.displayName = "MultiSwitch";
