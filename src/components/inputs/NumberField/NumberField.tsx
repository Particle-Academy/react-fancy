import { forwardRef, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Input } from "../Input";
import type { NumberFieldProps } from "./NumberField.types";

/**
 * Plain decimal notation only. `Number()` alone is not safe here: it reads "0x10"
 * as 16 and "Infinity" as a number, and those are wrong numbers to emit.
 */
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const WHOLE = /^[+-]?\d+$/;

/** The number the text says, or `null` if it does not say one. */
function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!NUMBER.test(trimmed)) return null;

  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  // Past 2^53 a whole number rounds to a different one than was typed.
  if (WHOLE.test(trimmed) && !Number.isSafeInteger(n)) return null;

  return n === 0 ? 0 : n; // -0 is 0
}

function formatNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

/** Decimal places in a number, so stepping can round away floating-point dust. */
function decimals(n: number): number {
  const [mantissa, exponent] = String(n).split("e");
  const places = (mantissa.split(".")[1] ?? "").length - Number(exponent ?? 0);
  return Math.min(Math.max(places, 0), 100);
}

function stepped(
  current: number | null,
  direction: 1 | -1,
  min: number | undefined,
  max: number | undefined,
  step: number,
): number {
  const base = min ?? 0;
  const places = Math.max(decimals(step), decimals(base));
  const at = (k: number) => Number((base + k * step).toFixed(places));
  const position = ((current ?? 0) - base) / step;
  const nudge = 1e-9;

  // The next grid line in that direction, so an off-grid value lands on the grid.
  let k =
    direction === 1
      ? Math.floor(position + nudge) + 1
      : Math.ceil(position - nudge) - 1;

  if (max !== undefined && at(k) > max) k = Math.floor((max - base) / step + nudge);
  if (min !== undefined && at(k) < min) k = 0;

  return at(k);
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  (
    {
      value,
      defaultValue = null,
      onValueChange,
      min,
      max,
      step,
      messages,
      name,
      form,
      inputMode,
      onKeyDown,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const [held, setValue] = useControllableState<number | null>(
      value,
      defaultValue,
      onValueChange,
    );
    // A host's NaN or Infinity has no text form, so it reads as no number.
    const current = typeof held === "number" && Number.isFinite(held) ? held : null;

    /*
     * The text is held apart from the number because "1." and "-" have no number
     * that displays them. It only moves on its own when the number moved to
     * something the text does not say: a change from outside, or a parent refusing
     * this one.
     */
    const [text, setText] = useState(() => formatNumber(current));
    if (parseNumber(text) !== current && text !== formatNumber(current)) {
      setText(formatNumber(current));
    }

    const stepSize = typeof step === "number" && step > 0 ? step : 1;

    const problem = (() => {
      if (text.trim() !== "" && parseNumber(text) === null) {
        return messages?.invalid ?? "Enter a number.";
      }
      if (current === null) return "";
      if (min !== undefined && current < min) return messages?.min ?? `Must be at least ${min}.`;
      if (max !== undefined && current > max) return messages?.max ?? `Must be at most ${max}.`;
      if (typeof step === "number" && step > 0) {
        const position = (current - (min ?? 0)) / step;
        if (Math.abs(position - Math.round(position)) > 1e-9) {
          return messages?.step ?? `Must be in steps of ${step}.`;
        }
      }
      return "";
    })();

    // The text input has no min/max/step of its own, so a form learns of them here.
    // Runs every render: click-to-edit mounts a fresh input.
    const inputRef = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
      inputRef.current?.setCustomValidity(problem);
    });

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || rest.disabled || rest.readOnly) return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

      e.preventDefault(); // or the caret jumps to the end of the text
      const next = stepped(current, e.key === "ArrowUp" ? 1 : -1, min, max, stepSize);
      setText(formatNumber(next));
      if (next !== current) setValue(next);
    };

    return (
      <div data-react-fancy-number-field="">
        <Input
          aria-invalid={problem ? true : undefined}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={current ?? undefined}
          inputMode={
            inputMode ??
            // A numeric or decimal keypad has no minus sign on iOS, so those are
            // only offered where a negative number cannot be valid.
            (min !== undefined && min >= 0
              ? typeof step === "number" && Number.isInteger(step)
                ? "numeric"
                : "decimal"
              : "text")
          }
          role="spinbutton"
          {...rest}
          ref={(el) => {
            inputRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          // Text, not `number`: a browser reports "-" and "1e" in a number input as
          // an empty value, indistinguishable from blank, and turns the wheel into
          // a value change on a focused field. Neither applies to a text input.
          type="text"
          value={text}
          onValueChange={(next) => {
            setText(next);
            const parsed = parseNumber(next);
            if (parsed !== current) setValue(parsed);
          }}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            setText(formatNumber(current));
            onBlur?.(e);
          }}
        />
        {/* What a native submit posts: the number, never the half-typed text. */}
        {name ? (
          <input
            type="hidden"
            name={name}
            form={form}
            disabled={rest.disabled}
            value={formatNumber(current)}
          />
        ) : null}
      </div>
    );
  },
);

NumberField.displayName = "NumberField";
