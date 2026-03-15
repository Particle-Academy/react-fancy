export type CalendarMode = "single" | "range" | "multiple";

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface CalendarProps {
  mode?: CalendarMode;
  value?: Date | Date[] | DateRange | null;
  onChange?: (value: Date | Date[] | DateRange | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  className?: string;
}
