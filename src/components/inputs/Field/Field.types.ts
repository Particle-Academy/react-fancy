import type { HTMLAttributes, ReactNode } from "react";
import type { Size } from "../../../utils/types";

export interface FieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  size?: Size;
  children: ReactNode;
  className?: string;
}
