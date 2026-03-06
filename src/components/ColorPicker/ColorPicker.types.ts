import type { Color } from "../../utils/types";

export interface ColorPickerProps {
  value?: Color;
  defaultValue?: Color;
  onChange?: (color: Color) => void;
  colors?: Color[];
  size?: "sm" | "md" | "lg";
  className?: string;
}
