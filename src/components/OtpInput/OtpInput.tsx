import { forwardRef, useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import { inlineStep } from "../../utils/direction";
import { fillLabel } from "../../utils/label-template";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useFieldMode } from "../inputs/mode/FieldMode.context";
import { useInlineEdit } from "../inputs/mode/useInlineEdit";
import type { OtpInputProps } from "./OtpInput.types";

export const OtpInput = forwardRef<HTMLDivElement, OtpInputProps>(
  function OtpInput(
    {
      length = 6,
      value: controlledValue,
      onChange,
      disabled = false,
      autoFocus = false,
      className,
      mode,
      label = "Verification code",
      "aria-labelledby": labelledBy,
      labels,
    },
    ref,
  ) {
    const digitLabel = labels?.digit ?? "Digit {n} of {total}";
    const [value, setValue] = useControllableState(
      controlledValue,
      "",
      onChange,
    );
    const resolvedMode = useFieldMode(mode);
    const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    const focusInput = useCallback(
      (index: number) => {
        const clamped = Math.max(0, Math.min(index, length - 1));
        inputsRef.current[clamped]?.focus();
      },
      [length],
    );

    const handleChange = useCallback(
      (index: number, raw: string) => {
        const chars = value.padEnd(length, " ").split("");
        const prev = chars[index].trim();
        // The cell has no maxLength, so typing beside a digit already there
        // delivers both. One new character next to the old one is a
        // replacement of that cell, not the start of a code.
        let text = raw;
        if (prev && raw.length === prev.length + 1) {
          if (raw.startsWith(prev)) text = raw.slice(prev.length);
          else if (raw.endsWith(prev)) text = raw.slice(0, 1);
        }
        const digits = text.replace(/[^0-9]/g, "");
        if (!digits) return;

        // Several digits at once (SMS autofill, an IME, a paste the browser
        // routed through `input`): spread them from this cell, as handlePaste
        // does from the first, dropping what does not fit.
        const placed = digits.slice(0, length - index);
        for (let k = 0; k < placed.length; k++) chars[index + k] = placed[k];
        setValue(chars.join("").trimEnd());

        // The next empty cell after what was written, else the last cell.
        let next = index + placed.length;
        while (next < length && chars[next].trim()) next++;
        focusInput(next < length ? next : length - 1);
      },
      [value, length, setValue, focusInput],
    );

    const handleKeyDown = useCallback(
      (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
          e.preventDefault();
          const chars = value.padEnd(length, " ").split("");
          if (chars[index]?.trim()) {
            chars[index] = " ";
            setValue(chars.join("").trimEnd());
          } else if (index > 0) {
            chars[index - 1] = " ";
            setValue(chars.join("").trimEnd());
            focusInput(index - 1);
          }
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          // Visual direction: the cells run right-to-left in RTL, so
          // ArrowLeft is the NEXT cell there.
          focusInput(index + inlineStep(e.key, e.currentTarget));
        }
      },
      [value, length, setValue, focusInput],
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
        const newValue = pasted.slice(0, length);
        setValue(newValue);
        focusInput(Math.min(newValue.length, length - 1));
      },
      [length, setValue, focusInput],
    );

    if (!showControl) {
      return (
        <div
          data-react-fancy-otp-input=""
          data-mode="view"
          ref={ref}
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          title={interactive ? "Click to edit" : undefined}
          onClick={interactive ? enterEdit : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    enterEdit();
                  }
                }
              : undefined
          }
          className={cn(
            "font-mono text-lg tracking-[0.4em] text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]",
            interactive &&
              "cursor-pointer rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-500/40",
            className,
          )}
        >
          {value || "—"}
        </div>
      );
    }

    return (
      <div
        data-react-fancy-otp-input=""
        ref={ref}
        // A code is a number, and numbers read left-to-right in RTL scripts
        // too: the cells stay in LTR order, sitting at the inline start
        // (the right) of an RTL page.
        dir="ltr"
        // One named group, so a screen reader announces "Verification code,
        // group" before the cells instead of six unrelated fields.
        role="group"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        className={cn("flex gap-2 rtl:justify-end", className)}
        onBlur={(e) => {
          if (interactive && !e.currentTarget.contains(e.relatedTarget as Node)) exitEdit();
        }}
      >
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            // No maxLength: a cell must accept a whole code (SMS autofill puts
            // it in the first cell) for handleChange to spread it. With
            // maxLength={1} the browser truncated it to one digit first.
            // Only the first cell offers the SMS code; the rest must not.
            autoComplete={i === 0 ? "one-time-code" : "off"}
            value={value[i] ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            autoFocus={(autoFocus || interactive) && i === 0}
            className="h-12 w-10 rounded-lg border border-[color:var(--fancy-border-strong,var(--color-zinc-500))] bg-[color:var(--fancy-input,var(--color-white))] text-center text-lg font-medium text-[color:var(--fancy-text,var(--color-zinc-900))] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:var(--fancy-focus,var(--color-blue-500))] focus:ring-2 focus:ring-[color:var(--fancy-focus,var(--color-blue-500))]/40 dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-500))] dark:bg-[color:var(--fancy-input-dark,#1e1e24)] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))] dark:focus:border-[color:var(--fancy-focus-dark,var(--color-blue-400))] dark:focus:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]/20"
            aria-label={fillLabel(digitLabel, { n: i + 1, total: length })}
          />
        ))}
      </div>
    );
  },
);

OtpInput.displayName = "OtpInput";
