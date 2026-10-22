import { useRef, useState, useEffect, useCallback, useId, useMemo, type Ref } from "react";
import { cn } from "../../../utils/cn";
import { composeRefs } from "../../../utils/compose-refs";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Field } from "../Field";
import { useFieldMode } from "../mode/FieldMode.context";
import { DisplayValue } from "../mode/DisplayValue";
import { useInlineEdit } from "../mode/useInlineEdit";
import { resolveOption } from "../inputs.utils";
import type { Color, Size } from "../../../utils/types";
import type { MultiSwitchProps } from "./MultiSwitch.types";
import { multiSwitchColorClasses } from "./MultiSwitch.colors";

const BORDER_DEFAULT =
  "border-[color:var(--fancy-border-strong,var(--color-zinc-300))] dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-700))]";

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
  labelHidden,
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
  mode,
  ...rest
}: MultiSwitchProps<V>) {
  const reactId = useId();
  // A `<label for>` cannot name a div[role="radiogroup"], so the group points at
  // the label instead. Needs an id the label and the group both agree on.
  const labelId = label ? `${id ?? reactId}-label` : undefined;

  // resolveOption hands an object option back as-is, so `color` survives it.
  const resolvedOptions = list.map(resolveOption) as Array<
    ReturnType<typeof resolveOption<V>> & { color?: Color }
  >;
  const fallback = defaultValue ?? resolvedOptions[0]?.value;
  const resolvedMode = useFieldMode(mode);
  const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);
  const [value, setValue] = useControllableState(controlledValue, fallback as V, onValueChange);

  const containerRef = useRef<HTMLDivElement>(null);
  const externalRef = (rest as { ref?: Ref<HTMLDivElement> }).ref;
  const containerSetRef = useMemo(() => composeRefs(externalRef, containerRef), [externalRef]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const selectedIndex = resolvedOptions.findIndex(
    (o) => o.value === value,
  );
  const selectedColor = resolvedOptions[selectedIndex]?.color;
  const colorClasses = selectedColor ? multiSwitchColorClasses[selectedColor] : undefined;

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

  const control = !showControl ? (
    <DisplayValue size={size} interactive={interactive} onActivate={enterEdit}>
      {resolvedOptions.find((o) => o.value === value)?.label}
    </DisplayValue>
  ) : (
    <div
      {...rest}
      // React 19 passes `ref` to a function component as a plain prop, so a
      // caller's ref (Tooltip's anchor, or anyone's) arrives in `rest`. Spread
      // after `ref={containerRef}` it REPLACED the ref the thumb is measured
      // from, and the selected thumb never rendered. Feed both instead.
      ref={containerSetRef}
      data-react-fancy-multi-switch=""
      role="radiogroup"
      id={id}
      aria-labelledby={labelId}
      onBlur={(e) => {
        if (interactive && !e.currentTarget.contains(e.relatedTarget as Node)) exitEdit();
      }}
      className={cn(
        "relative inline-flex rounded-lg border bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]",
        colorClasses ? colorClasses.border : BORDER_DEFAULT,
        dirty && "ring-2 ring-amber-400/50",
        error && "ring-2 ring-red-500/50",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {indicator && (
        <span
          data-react-fancy-multi-switch-thumb=""
          data-color={selectedColor}
          className={
            colorClasses
              ? `absolute top-0 bottom-0 rounded-lg ${colorClasses.thumb} transition-all duration-200 ease-out`
              : "absolute top-0 bottom-0 rounded-lg bg-blue-600 transition-all duration-200 ease-out"
          }
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
            autoFocus={interactive && (selectedIndex === -1 ? index === 0 : isSelected)}
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
                ? (colorClasses?.text ?? "text-white")
                : "text-[color:var(--fancy-text-subtle,var(--color-zinc-600))] hover:text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-subtle-dark,var(--color-zinc-400))] dark:hover:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]",
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
      <Field
        label={label}
        labelHidden={labelHidden}
        labelId={labelId}
        description={description}
        error={error}
        required={required}
        htmlFor={id}
        size={size}
      >
        {control}
      </Field>
    );
  }

  return control;
}

MultiSwitch.displayName = "MultiSwitch";
