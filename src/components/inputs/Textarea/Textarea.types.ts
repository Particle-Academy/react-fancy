import type { TextareaHTMLAttributes } from "react";
import type { InputBaseProps, InputAffixProps } from "../inputs.types";

export interface TextareaProps
  extends InputBaseProps,
    InputAffixProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size" | "prefix"> {
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  onValueChange?: (value: string) => void;
}
