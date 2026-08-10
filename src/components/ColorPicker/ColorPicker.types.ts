import type { HTMLAttributes } from "react";

import type { FieldMode } from "../inputs/inputs.types";

/**
 * Extends the native div attributes so `id`, `data-*` and `aria-*` reach the
 * DOM instead of being dropped — the same defect swept out of `Switch`,
 * `Checkbox` and friends in 5.8.0 (#22), which this component was not part of.
 *
 * `onChange` is omitted because this one hands you the colour string, not the
 * event.
 */
export interface ColorPickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "color"> {
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
