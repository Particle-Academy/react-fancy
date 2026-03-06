import type { ReactNode, ButtonHTMLAttributes } from "react";
import type { Color, Size, Variant } from "../../utils/types";

export interface ActionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  color?: Color;
  size?: Size;
  variant?: Variant;
  icon?: ReactNode;
  iconTrailing?: ReactNode;
  loading?: boolean;
  href?: string;
}
