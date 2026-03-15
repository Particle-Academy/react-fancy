import type { SelectHTMLAttributes } from "react";
import type { InputBaseProps, InputOption, InputOptionGroup, InputAffixProps } from "../inputs.types";

export interface SelectProps
  extends InputBaseProps,
    InputAffixProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "prefix"> {
  list: InputOption[] | InputOptionGroup[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
}
