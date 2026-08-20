import type { HTMLAttributes, ReactNode } from "react";
import type { Size } from "../../../utils/types";

export interface FieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label?: string;
  /** Render the label for screen readers only — see `InputBaseProps.labelHidden`. */
  labelHidden?: boolean;
  /**
   * `id` for the rendered `<label>`, so a control that `htmlFor` cannot name
   * can point `aria-labelledby` at it.
   *
   * `<label for>` only names LABELABLE elements — input, select, textarea,
   * button. A `div[role="radiogroup"]` is not one, so a grouped control was
   * left unnamed by a label sitting right beside it.
   */
  labelId?: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  size?: Size;
  children: ReactNode;
  className?: string;
}
