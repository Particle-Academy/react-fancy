import { forwardRef, useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import type { CalendarProps, DateRange } from "./Calendar.types";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();

  // Fill leading days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Fill current month
  const lastDate = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDate; d++) {
    days.push(new Date(year, month, d));
  }

  // Fill trailing days to complete 6 rows
  while (days.length < 42) {
    days.push(new Date(year, month + 1, days.length - startDayOfWeek - lastDate + 1));
  }

  return days;
}

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(
  function Calendar(
    {
      mode = "single",
      value,
      onChange,
      minDate,
      maxDate,
      disabledDates = [],
      className,
    },
    ref,
  ) {
    const today = useMemo(() => new Date(), []);
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [rangeHover, setRangeHover] = useState<Date | null>(null);

    const days = useMemo(
      () => getDaysInMonth(viewYear, viewMonth),
      [viewYear, viewMonth],
    );

    const prevMonth = useCallback(() => {
      setViewMonth((m) => {
        if (m === 0) {
          setViewYear((y) => y - 1);
          return 11;
        }
        return m - 1;
      });
    }, []);

    const nextMonth = useCallback(() => {
      setViewMonth((m) => {
        if (m === 11) {
          setViewYear((y) => y + 1);
          return 0;
        }
        return m + 1;
      });
    }, []);

    const isDisabled = useCallback(
      (date: Date): boolean => {
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return disabledDates.some((d) => isSameDay(d, date));
      },
      [minDate, maxDate, disabledDates],
    );

    const isSelected = useCallback(
      (date: Date): boolean => {
        if (!value) return false;
        if (mode === "single" && value instanceof Date) {
          return isSameDay(date, value);
        }
        if (mode === "multiple" && Array.isArray(value)) {
          return value.some((v) => isSameDay(date, v));
        }
        if (mode === "range" && value && typeof value === "object" && "start" in value) {
          const range = value as DateRange;
          if (range.start && isSameDay(date, range.start)) return true;
          if (range.end && isSameDay(date, range.end)) return true;
        }
        return false;
      },
      [value, mode],
    );

    const isInRange = useCallback(
      (date: Date): boolean => {
        if (mode !== "range" || !value || typeof value !== "object" || !("start" in value))
          return false;
        const range = value as DateRange;
        if (!range.start) return false;
        const end = range.end ?? rangeHover;
        if (!end) return false;
        const [s, e] = range.start <= end ? [range.start, end] : [end, range.start];
        return date > s && date < e;
      },
      [value, mode, rangeHover],
    );

    const handleSelect = useCallback(
      (date: Date) => {
        if (isDisabled(date)) return;

        if (mode === "single") {
          onChange?.(date);
        } else if (mode === "multiple") {
          const arr = (Array.isArray(value) ? value : []) as Date[];
          const exists = arr.findIndex((d) => isSameDay(d, date));
          if (exists >= 0) {
            onChange?.(arr.filter((_, i) => i !== exists));
          } else {
            onChange?.([...arr, date]);
          }
        } else if (mode === "range") {
          const range = (value && typeof value === "object" && "start" in value
            ? value
            : { start: null, end: null }) as DateRange;

          if (!range.start || range.end) {
            onChange?.({ start: date, end: null });
          } else {
            const [s, e] =
              date >= range.start ? [range.start, date] : [date, range.start];
            onChange?.({ start: s, end: e });
          }
        }
      },
      [mode, value, onChange, isDisabled],
    );

    const btnBase =
      "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors";

    return (
      <div
        data-react-fancy-calendar=""
        ref={ref}
        className={cn(
          "inline-block w-72 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900",
          className,
        )}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div
              key={d}
              className="flex h-8 items-center justify-center text-xs font-medium text-zinc-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => {
            const isCurrentMonth = date.getMonth() === viewMonth;
            const selected = isSelected(date);
            const inRange = isInRange(date);
            const disabled = isDisabled(date);
            const isToday = isSameDay(date, today);

            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(date)}
                onMouseEnter={() =>
                  mode === "range" && setRangeHover(date)
                }
                className={cn(
                  btnBase,
                  !isCurrentMonth && "text-zinc-300 dark:text-zinc-600",
                  isCurrentMonth &&
                    !selected &&
                    !inRange &&
                    "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  inRange &&
                    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                  selected &&
                    "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
                  isToday && !selected && "font-bold",
                  disabled && "cursor-not-allowed opacity-30",
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);

Calendar.displayName = "Calendar";
