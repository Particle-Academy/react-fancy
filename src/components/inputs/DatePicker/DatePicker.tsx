import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Field } from "../Field";
import { useFieldMode } from "../mode/FieldMode.context";
import { DisplayValue } from "../mode/DisplayValue";
import { useInlineEdit } from "../mode/useInlineEdit";
import {
  dirtyClasses,
  errorClasses,
  inputBaseClasses,
  inputSizeClasses,
} from "../inputs.utils";
import type { DatePickerProps } from "./DatePicker.types";

/** Locale-format an ISO date / datetime-local string; fall back to the raw value. */
function formatDateValue(iso: string, includeTime?: boolean): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return includeTime
    ? date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

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
      includeTime,
      mode,
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
    const resolvedMode = useFieldMode(mode);
    const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);
    const [value, setValue] = useControllableState(
      singleProps.value,
      singleProps.defaultValue ?? "",
      singleProps.onValueChange,
    );

    const input = !showControl ? (
      <DisplayValue
        size={size}
        className={className}
        interactive={interactive}
        onActivate={enterEdit}
      >
        {formatDateValue(value, includeTime)}
      </DisplayValue>
    ) : (
      <input
        data-react-fancy-date-picker=""
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
        autoFocus={interactive}
        onBlur={() => {
          if (interactive) exitEdit();
        }}
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
      includeTime,
      mode,
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
    const resolvedMode = useFieldMode(mode);
    const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);
    const [value, setValue] = useControllableState(
      rangeProps.value,
      rangeProps.defaultValue ?? ["", ""] as [string, string],
      rangeProps.onValueChange,
    );

    const input = !showControl ? (
      <DisplayValue
        size={size}
        className={className}
        interactive={interactive}
        onActivate={enterEdit}
      >
        {value[0] || value[1]
          ? `${formatDateValue(value[0], includeTime)} – ${formatDateValue(value[1], includeTime)}`
          : ""}
      </DisplayValue>
    ) : (
      <div
        data-react-fancy-date-picker=""
        className={cn("flex items-center gap-2", className)}
        onBlur={(e) => {
          if (interactive && !e.currentTarget.contains(e.relatedTarget as Node)) exitEdit();
        }}
      >
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
          autoFocus={interactive}
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
