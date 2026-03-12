import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Field } from "../Field";
import {
  dirtyClasses,
  errorClasses,
  inputBaseClasses,
  inputSizeClasses,
} from "../inputs.utils";
import type { DatePickerProps } from "./DatePicker.types";

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
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
      min,
      max,
      includeTime,
    } = props;

    const autoId = useId();
    const pickerId = id ?? autoId;
    const inputType = includeTime ? "datetime-local" : "date";

    const inputClasses = cn(
      inputBaseClasses,
      inputSizeClasses[size],
      dirtyClasses(dirty),
      errorClasses(error),
      "w-full",
    );

    if (props.range) {
      return (
        <RangeDatePicker
          {...props}
          id={pickerId}
          inputType={inputType}
          inputClasses={inputClasses}
          ref={ref}
        />
      );
    }

    return (
      <SingleDatePicker
        {...props}
        range={false}
        id={pickerId}
        inputType={inputType}
        inputClasses={inputClasses}
        ref={ref}
      />
    );
  },
);

DatePicker.displayName = "DatePicker";

interface InternalProps {
  inputType: string;
  inputClasses: string;
}

const SingleDatePicker = forwardRef<
  HTMLInputElement,
  DatePickerProps & { range?: false } & InternalProps
>(
  (
    {
      size = "md",
      error,
      label,
      description,
      required,
      disabled,
      className,
      id,
      name,
      min,
      max,
      inputType,
      inputClasses,
      ...rest
    },
    ref,
  ) => {
    const singleProps = rest as {
      value?: string;
      defaultValue?: string;
      onValueChange?: (v: string) => void;
    };
    const [value, setValue] = useControllableState(
      singleProps.value,
      singleProps.defaultValue ?? "",
      singleProps.onValueChange,
    );

    const input = (
      <input
        ref={ref}
        id={id}
        type={inputType}
        name={name}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => setValue(e.target.value)}
        className={cn(inputClasses, className)}
      />
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          description={description}
          error={error}
          required={required}
          htmlFor={id}
          size={size}
        >
          {input}
        </Field>
      );
    }

    return input;
  },
);

SingleDatePicker.displayName = "SingleDatePicker";

const RangeDatePicker = forwardRef<
  HTMLInputElement,
  DatePickerProps & { range: true } & InternalProps
>(
  (
    {
      size = "md",
      error,
      label,
      description,
      required,
      disabled,
      className,
      id,
      name,
      min,
      max,
      inputType,
      inputClasses,
      ...rest
    },
    ref,
  ) => {
    const rangeProps = rest as {
      value?: [string, string];
      defaultValue?: [string, string];
      onValueChange?: (v: [string, string]) => void;
    };
    const [value, setValue] = useControllableState(
      rangeProps.value,
      rangeProps.defaultValue ?? ["", ""] as [string, string],
      rangeProps.onValueChange,
    );

    const input = (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          ref={ref}
          id={id}
          type={inputType}
          name={name ? `${name}_start` : undefined}
          min={min}
          max={value[1] || max}
          value={value[0]}
          disabled={disabled}
          required={required}
          onChange={(e) => setValue([e.target.value, value[1]])}
          className={inputClasses}
        />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">to</span>
        <input
          type={inputType}
          name={name ? `${name}_end` : undefined}
          min={value[0] || min}
          max={max}
          value={value[1]}
          disabled={disabled}
          onChange={(e) => setValue([value[0], e.target.value])}
          className={inputClasses}
        />
      </div>
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          description={description}
          error={error}
          required={required}
          htmlFor={id}
          size={size}
        >
          {input}
        </Field>
      );
    }

    return input;
  },
);

RangeDatePicker.displayName = "RangeDatePicker";
