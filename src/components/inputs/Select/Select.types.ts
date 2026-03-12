import type { SelectHTMLAttributes } from "react";
import type { InputBaseProps, InputOption, InputOptionGroup } from "../inputs.types";

export interface SelectProps
  extends InputBaseProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  list: InputOption[] | InputOptionGroup[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
}
