import type { Color } from "../../utils/types";

export interface ProgressProps {
  value?: number;
  max?: number;
  variant?: "bar" | "circular";
  size?: "sm" | "md" | "lg";
  color?: Color;
  indeterminate?: boolean;
  showValue?: boolean;
  className?: string;
}
