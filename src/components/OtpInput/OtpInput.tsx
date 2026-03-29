import { forwardRef, useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
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
    },
    ref,
  ) {
    const [value, setValue] = useControllableState(
      controlledValue,
      "",
      onChange,
    );
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    const focusInput = useCallback(
      (index: number) => {
        const clamped = Math.max(0, Math.min(index, length - 1));
        inputsRef.current[clamped]?.focus();
      },
      [length],
    );

    const handleChange = useCallback(
      (index: number, char: string) => {
        const digit = char.replace(/[^0-9]/g, "");
        if (!digit) return;

        const chars = value.padEnd(length, " ").split("");
        chars[index] = digit[0];
        const newValue = chars.join("").trimEnd();
        setValue(newValue);

        if (index < length - 1) {
          focusInput(index + 1);
        }
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
        } else if (e.key === "ArrowLeft") {
          focusInput(index - 1);
        } else if (e.key === "ArrowRight") {
          focusInput(index + 1);
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

    return (
      <div data-react-fancy-otp-input="" ref={ref} className={cn("flex gap-2", className)}>
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            className="h-12 w-10 rounded-lg border border-zinc-200 bg-white text-center text-lg font-medium text-zinc-900 outline-none transition-[border-color,box-shadow] duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-zinc-700 dark:bg-[#1e1e24] dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
    );
  },
);

OtpInput.displayName = "OtpInput";
