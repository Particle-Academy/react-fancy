import type { FieldMode } from "../inputs/inputs.types";

export interface TimePickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  format?: "12h" | "24h";
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
  /** `"edit"` (default) renders the spinners; `"view"` renders the time as text. */
  mode?: FieldMode;
}
