import type { FieldMode } from "../inputs/inputs.types";

export interface ColorPickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  presets?: string[];
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "filled";
  disabled?: boolean;
  className?: string;
  /** `"edit"` (default) renders the control; `"view"` renders the value as text. */
  mode?: FieldMode;
}
