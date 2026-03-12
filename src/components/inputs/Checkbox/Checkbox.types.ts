import type { InputBaseProps } from "../inputs.types";

export interface CheckboxProps
  extends Omit<InputBaseProps, "label"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  label?: string;
}
