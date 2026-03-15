import type { InputHTMLAttributes, ReactNode } from "react";
import type { InputBaseProps, InputAffixProps } from "../inputs.types";

export interface InputProps
  extends InputBaseProps,
    InputAffixProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "prefix"> {
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  onValueChange?: (value: string) => void;
  leading?: ReactNode;
  trailing?: ReactNode;
}
