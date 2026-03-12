import type { InputBaseProps } from "../inputs.types";

interface DatePickerBaseProps extends InputBaseProps {
  min?: string;
  max?: string;
  includeTime?: boolean;
}

export interface DatePickerSingleProps extends DatePickerBaseProps {
  range?: false;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export interface DatePickerRangeProps extends DatePickerBaseProps {
  range: true;
  value?: [string, string];
  defaultValue?: [string, string];
  onValueChange?: (value: [string, string]) => void;
}

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;
