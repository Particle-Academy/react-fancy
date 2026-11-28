import type { HTMLAttributes } from "react";
import type { InputBaseProps } from "../inputs.types";
import type { Color } from "../../../utils/types";

export interface SwitchProps
  extends Omit<InputBaseProps, "label">,
    Omit<HTMLAttributes<HTMLDivElement>, "color" | "defaultChecked" | "onChange" | "id"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /**
   * The checked track's colour. Unset, it follows the kit accent
   * (`--fancy-accent` / `--fancy-accent-dark`), falling back to the blue-500 it
   * has always been. An explicit colour always wins.
   */
  color?: Color;
  label?: string;
}
