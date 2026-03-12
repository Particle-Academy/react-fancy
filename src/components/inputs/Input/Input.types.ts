import type { InputHTMLAttributes, ReactNode } from "react";
import type { InputBaseProps } from "../inputs.types";

export interface InputProps
  extends InputBaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  onValueChange?: (value: string) => void;
  leading?: ReactNode;
  trailing?: ReactNode;
}
