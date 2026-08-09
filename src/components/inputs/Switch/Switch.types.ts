import type { HTMLAttributes } from "react";
import type { InputBaseProps } from "../inputs.types";
import type { Color } from "../../../utils/types";

export interface SwitchProps
  extends Omit<InputBaseProps, "label">,
    Omit<HTMLAttributes<HTMLDivElement>, "color" | "defaultChecked" | "onChange" | "id"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  color?: Color;
  label?: string;
}
