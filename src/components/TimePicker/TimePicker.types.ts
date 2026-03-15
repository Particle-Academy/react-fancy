export interface TimePickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  format?: "12h" | "24h";
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
}
