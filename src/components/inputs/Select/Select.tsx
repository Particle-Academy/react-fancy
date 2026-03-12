import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { Field } from "../Field";
import {
  dirtyClasses,
  errorClasses,
  inputBaseClasses,
  inputSizeClasses,
  resolveOption,
} from "../inputs.utils";
import type { InputOption, InputOptionGroup } from "../inputs.types";
import type { SelectProps } from "./Select.types";

function isOptionGroup(
  item: InputOption | InputOptionGroup,
): item is InputOptionGroup {
  return typeof item === "object" && "options" in item;
}

function renderOption(option: InputOption, index: number) {
  const resolved = resolveOption(option);
  return (
    <option
      key={`${resolved.value}-${index}`}
      value={resolved.value as string}
      disabled={resolved.disabled}
    >
      {resolved.label}
    </option>
  );
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
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
      list,
      placeholder,
      onValueChange,
      onChange,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const selectId = id ?? autoId;

    const select = (
      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        required={required}
        className={cn(
          inputBaseClasses,
          inputSizeClasses[size],
          dirtyClasses(dirty),
          errorClasses(error),
          "w-full appearance-none bg-no-repeat bg-[length:16px] bg-[right_8px_center]",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]",
          "pr-8",
          className,
        )}
        onChange={(e) => {
          onChange?.(e);
          onValueChange?.(e.target.value);
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {list.map((item, index) =>
          isOptionGroup(item) ? (
            <optgroup key={`group-${index}`} label={item.label}>
              {item.options.map((opt, optIndex) =>
                renderOption(opt, optIndex),
              )}
            </optgroup>
          ) : (
            renderOption(item, index)
          ),
        )}
      </select>
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          description={description}
          error={error}
          required={required}
          htmlFor={selectId}
          size={size}
        >
          {select}
        </Field>
      );
    }

    return select;
  },
);

Select.displayName = "Select";
