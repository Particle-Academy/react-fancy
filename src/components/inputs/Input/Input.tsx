import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { Field } from "../Field";
import { InputWrapper } from "../InputWrapper";
import {
  dirtyClasses,
  errorClasses,
  inputBaseClasses,
  inputSizeClasses,
} from "../inputs.utils";
import type { InputProps } from "./Input.types";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = "text",
      size = "md",
      dirty,
      error,
      label,
      description,
      required,
      disabled,
      className,
      id,
      leading,
      trailing,
      prefix,
      suffix,
      prefixPosition,
      suffixPosition,
      onValueChange,
      onChange,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    const input = (
      <InputWrapper
        prefix={prefix}
        suffix={suffix}
        prefixPosition={prefixPosition}
        suffixPosition={suffixPosition}
        size={size}
      >
        <div data-react-fancy-input="" className="relative flex items-center">
          {leading && (
            <span className="pointer-events-none absolute left-3 text-zinc-400 dark:text-zinc-500">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            required={required}
            className={cn(
              inputBaseClasses,
              inputSizeClasses[size],
              dirtyClasses(dirty),
              errorClasses(error),
              "w-full",
              leading && "pl-9",
              trailing && "pr-9",
              className,
            )}
            onChange={(e) => {
              onChange?.(e);
              onValueChange?.(e.target.value);
            }}
            {...props}
          />
          {trailing && (
            <span className="pointer-events-none absolute right-3 text-zinc-400 dark:text-zinc-500">
              {trailing}
            </span>
          )}
        </div>
      </InputWrapper>
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          description={description}
          error={error}
          required={required}
          htmlFor={inputId}
          size={size}
        >
          {input}
        </Field>
      );
    }

    return input;
  },
);

Input.displayName = "Input";
