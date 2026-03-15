import { forwardRef, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import type { TimePickerProps } from "./TimePicker.types";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseTime(val: string): { hours: number; minutes: number } {
  const [h, m] = val.split(":").map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  function TimePicker(
    {
      value: controlledValue,
      defaultValue = "12:00",
      onChange,
      format = "12h",
      minuteStep = 1,
      disabled = false,
      className,
    },
    ref,
  ) {
    const [value, setValue] = useControllableState(
      controlledValue,
      defaultValue,
      onChange,
    );

    const { hours: h24, minutes } = parseTime(value);
    const isPM = h24 >= 12;
    const displayHour = format === "12h" ? (h24 % 12 || 12) : h24;

    const updateTime = useCallback(
      (hours: number, mins: number) => {
        setValue(`${pad(hours)}:${pad(mins)}`);
      },
      [setValue],
    );

    const changeHour = useCallback(
      (delta: number) => {
        const newHour = (h24 + delta + 24) % 24;
        updateTime(newHour, minutes);
      },
      [h24, minutes, updateTime],
    );

    const changeMinute = useCallback(
      (delta: number) => {
        const newMin = (minutes + delta + 60) % 60;
        updateTime(h24, newMin);
      },
      [h24, minutes, updateTime],
    );

    const toggleAmPm = useCallback(() => {
      updateTime((h24 + 12) % 24, minutes);
    }, [h24, minutes, updateTime]);

    const spinBtnClass =
      "flex h-7 w-full items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 disabled:opacity-50";
    const displayClass =
      "flex h-10 w-12 items-center justify-center text-lg font-medium tabular-nums";

    return (
      <div
        data-react-fancy-time-picker=""
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900",
          disabled && "opacity-50",
          className,
        )}
      >
        {/* Hour column */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => changeHour(1)} disabled={disabled} className={spinBtnClass} aria-label="Increase hour">
            <ChevronUp size={14} />
          </button>
          <div className={displayClass}>{pad(displayHour)}</div>
          <button type="button" onClick={() => changeHour(-1)} disabled={disabled} className={spinBtnClass} aria-label="Decrease hour">
            <ChevronDown size={14} />
          </button>
        </div>

        <span className="text-lg text-zinc-400">:</span>

        {/* Minute column */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => changeMinute(minuteStep)} disabled={disabled} className={spinBtnClass} aria-label="Increase minute">
            <ChevronUp size={14} />
          </button>
          <div className={displayClass}>{pad(minutes)}</div>
          <button type="button" onClick={() => changeMinute(-minuteStep)} disabled={disabled} className={spinBtnClass} aria-label="Decrease minute">
            <ChevronDown size={14} />
          </button>
        </div>

        {/* AM/PM toggle */}
        {format === "12h" && (
          <button
            type="button"
            onClick={toggleAmPm}
            disabled={disabled}
            className="ml-1 rounded-lg bg-zinc-100 px-2 py-1 text-sm font-medium transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {isPM ? "PM" : "AM"}
          </button>
        )}
      </div>
    );
  },
);

TimePicker.displayName = "TimePicker";
