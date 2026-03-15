import { forwardRef, useEffect, useId, useRef } from "react";
import { cn } from "../../../utils/cn";
import { Field } from "../Field";
import { InputWrapper } from "../InputWrapper";
import {
  dirtyClasses,
  errorClasses,
  inputBaseClasses,
  inputSizeClasses,
} from "../inputs.utils";
import type { TextareaProps } from "./Textarea.types";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
      autoResize,
      minRows = 3,
      maxRows,
      prefix,
      suffix,
      prefixPosition: _prefixPosition,
      suffixPosition: _suffixPosition,
      onValueChange,
      onChange,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const textareaId = id ?? autoId;
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      const el = internalRef.current;
      if (!autoResize || !el) return;
      el.style.height = "auto";
      const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows ? maxRows * lineHeight : Infinity;
      el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
    }, [autoResize, minRows, maxRows, value, defaultValue]);

    const textarea = (
      <InputWrapper
        prefix={prefix}
        suffix={suffix}
        prefixPosition="outside"
        suffixPosition="outside"
        size={size}
      >
        <textarea
          data-react-fancy-textarea=""
          ref={(node) => {
            internalRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          id={textareaId}
          disabled={disabled}
          required={required}
          rows={autoResize ? minRows : minRows}
          value={value}
          defaultValue={defaultValue}
          className={cn(
            inputBaseClasses,
            inputSizeClasses[size],
            dirtyClasses(dirty),
            errorClasses(error),
            "w-full resize-y",
            autoResize && "resize-none overflow-hidden",
            className,
          )}
          onChange={(e) => {
            onChange?.(e);
            onValueChange?.(e.target.value);
          }}
          {...props}
        />
      </InputWrapper>
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          description={description}
          error={error}
          required={required}
          htmlFor={textareaId}
          size={size}
        >
          {textarea}
        </Field>
      );
    }

    return textarea;
  },
);

Textarea.displayName = "Textarea";
