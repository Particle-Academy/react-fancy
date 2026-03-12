import type { TextareaHTMLAttributes } from "react";
import type { InputBaseProps } from "../inputs.types";

export interface TextareaProps
  extends InputBaseProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  onValueChange?: (value: string) => void;
}
