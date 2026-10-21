import type { ReactNode } from "react";

export type CalendarMode = "single" | "range" | "multiple";

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/** Everything a per-day hook needs to know about one day cell. */
export interface CalendarDayContext {
  date: Date;
  /** Stable id: `dateId(date)`, default `YYYY-MM-DD` in local time. Also on the cell as `data-react-fancy-calendar-day`. */
  id: string;
  selected: boolean;
  disabled: boolean;
  /** Strictly between a range's ends (range mode). */
  inRange: boolean;
  /** A leading/trailing day from the neighbouring month. */
  outsideMonth: boolean;
  today: boolean;
}

export interface CalendarProps {
  mode?: CalendarMode;
  value?: Date | Date[] | DateRange | null;
  onChange?: (value: Date | Date[] | DateRange | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  className?: string;

  /** Stable id per day. Default `YYYY-MM-DD` in local time. */
  dateId?: (date: Date) => string;
  /** The day cell's content. Default: the day number. The cell (button, click, state classes) stays the Calendar's. */
  renderDay?: (ctx: CalendarDayContext) => ReactNode;
  /** Extra classes for one day cell, merged after the built-in ones. */
  dayClassName?: (ctx: CalendarDayContext) => string | undefined;
  /**
   * The day cell's accessible name. Pair it with `dayClassName`: a shaded day
   * must say what the shade means. It REPLACES the name, so include the date.
   */
  dayAriaLabel?: (ctx: CalendarDayContext) => string | undefined;
  /** Controlled visible month (any day in it). Uncontrolled when omitted; starts at today. */
  visibleMonth?: Date;
  /** Called with the 1st of the month navigated to, controlled or not. */
  onVisibleMonthChange?: (month: Date) => void;
}
