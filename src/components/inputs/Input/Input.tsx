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
import { useFieldMode } from "../mode/FieldMode.context";
import { DisplayValue } from "../mode/DisplayValue";
import { useInlineEdit } from "../mode/useInlineEdit";
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
      mode,
      onValueChange,
      onChange,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const resolvedMode = useFieldMode(mode);
    const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);

    const input = !showControl ? (
      <DisplayValue
        size={size}
        interactive={interactive}
        onActivate={enterEdit}
        leading={leading ?? prefix}
        trailing={trailing ?? suffix}
      >
        {type === "password" ? (props.value ? "••••••" : "") : (props.value as string | undefined)}
      </DisplayValue>
    ) : (
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
            // Inline click-to-edit: focus on entering edit, return to the display
            // (and run the host's onBlur) when focus leaves.
            autoFocus={interactive || props.autoFocus}
            onBlur={(e) => {
              props.onBlur?.(e);
              if (interactive) exitEdit();
            }}
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
