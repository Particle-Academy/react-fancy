import { useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Field } from "../Field";
import { dirtyRingClasses, resolveOption } from "../inputs.utils";
import type { RadioGroupProps } from "./RadioGroup.types";

export function RadioGroup<V = string>({
  size = "md",
  dirty,
  error,
  label,
  description,
  required,
  disabled,
  className,
  name,
  list,
  value: controlledValue,
  defaultValue,
  onValueChange,
  orientation = "vertical",
}: RadioGroupProps<V>) {
  const groupId = useId();
  const radioName = name ?? groupId;
  const [value, setValue] = useControllableState(
    controlledValue,
    defaultValue as V,
    onValueChange,
  );

  const sizeClasses = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-[18px] w-[18px]",
    lg: "h-5 w-5",
    xl: "h-6 w-6",
  }[size];

  const content = (
    <div
      data-react-fancy-radio-group=""
      role="radiogroup"
      className={cn(
        "flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
    >
      {list.map((option, index) => {
        const resolved = resolveOption(option);
        const optionId = `${groupId}-${index}`;
        const isSelected = value === resolved.value;

        return (
          <div key={optionId} className="flex items-start gap-2">
            <input
              id={optionId}
              type="radio"
              name={radioName}
              value={String(resolved.value)}
              checked={isSelected}
              disabled={disabled || resolved.disabled}
              onChange={() => setValue(resolved.value)}
              className={cn(
                sizeClasses,
                "cursor-pointer border border-zinc-300 bg-white text-blue-600 transition-[border-color,box-shadow] duration-150 focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-[#1e1e24]",
                dirtyRingClasses(dirty),
                error && "border-red-500",
              )}
            />
            <div className="flex flex-col">
              <label
                htmlFor={optionId}
                className={cn(
                  "cursor-pointer text-sm text-zinc-700 dark:text-zinc-100",
                  (disabled || resolved.disabled) &&
                    "cursor-not-allowed opacity-50",
                )}
              >
                {resolved.label}
              </label>
              {resolved.description && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
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

RadioGroup.displayName = "RadioGroup";
