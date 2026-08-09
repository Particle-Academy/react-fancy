import type { HTMLAttributes } from "react";
import type { InputBaseProps } from "../inputs.types";

export interface CheckboxProps
  extends Omit<InputBaseProps, "label">,
    Omit<HTMLAttributes<HTMLDivElement>, "color" | "defaultChecked" | "onChange" | "id"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  label?: string;
}
