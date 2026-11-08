import { useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Field } from "../Field";
import { useFieldMode } from "../mode/FieldMode.context";
import { DisplayValue } from "../mode/DisplayValue";
import { useInlineEdit } from "../mode/useInlineEdit";
import { dirtyRingClasses, optionLabelList, optionLangProps, resolveOption } from "../inputs.utils";
import type { CheckboxGroupProps } from "./CheckboxGroup.types";

export function CheckboxGroup<V = string>({
  size = "md",
  dirty,
  error,
  label,
  labelHidden,
  description,
  required,
  disabled,
  className,
  name,
  list,
  value: controlledValue,
  defaultValue = [],
  onValueChange,
  orientation = "vertical",
  mode,
  ...rest
}: CheckboxGroupProps<V>) {
  const groupId = useId();
  const resolvedMode = useFieldMode(mode);
  const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);
  const [value, setValue] = useControllableState(
    controlledValue,
    defaultValue,
    onValueChange,
  );

  const handleToggle = (optionValue: V) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    setValue(next);
  };

  const sizeClasses = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-[18px] w-[18px]",
    lg: "h-5 w-5",
    xl: "h-6 w-6",
  }[size];

  const content = !showControl ? (
    <DisplayValue size={size} interactive={interactive} onActivate={enterEdit}>
      {optionLabelList(list.map(resolveOption).filter((o) => value.includes(o.value)))}
    </DisplayValue>
  ) : (
    <div
      {...rest}
      data-react-fancy-checkbox-group=""
      onBlur={(e) => {
        if (interactive && !e.currentTarget.contains(e.relatedTarget as Node)) exitEdit();
      }}
      className={cn(
        "flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
    >
      {list.map((option, index) => {
        const resolved = resolveOption(option);
        const optionId = `${groupId}-${index}`;
        const isChecked = value.includes(resolved.value);

        return (
          <div key={optionId} className="flex items-start gap-2">
            <input
              id={optionId}
              type="checkbox"
              name={name}
              value={String(resolved.value)}
              checked={isChecked}
              disabled={disabled || resolved.disabled}
              autoFocus={interactive && index === 0}
              onChange={() => handleToggle(resolved.value)}
              className={cn(
                sizeClasses,
                // Native checkboxes: no author borders or backgrounds (the
                // browser ignores them, 6.15.1 / 6.17.0); themed via
                // accent-color and a dark scheme.
                "cursor-pointer rounded accent-[color:var(--fancy-accent,var(--color-blue-600))] dark:accent-[color:var(--fancy-accent-dark,var(--color-blue-600))] transition-[box-shadow] duration-150 focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:[color-scheme:dark]",
                dirtyRingClasses(dirty),
              )}
            />
            <div className="flex flex-col">
              <label
                htmlFor={optionId}
                {...optionLangProps(resolved)}
                className={cn(
                  "cursor-pointer text-sm text-zinc-700 dark:text-zinc-100",
                  (disabled || resolved.disabled) &&
                    "cursor-not-allowed opacity-50",
                )}
              >
                {resolved.label}
              </label>
              {resolved.description && (
                <span className="text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
                  {resolved.description}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (label || error || description) {
    return (
      <Field
        label={label}
        labelHidden={labelHidden}
        description={description}
        error={error}
        required={required}
        size={size}
      >
        {content}
      </Field>
    );
  }

  return content;
}

CheckboxGroup.displayName = "CheckboxGroup";
