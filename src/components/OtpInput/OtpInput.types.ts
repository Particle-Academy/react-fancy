import type { FieldMode } from "../inputs/inputs.types";

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** `"edit"` (default) renders the inputs; `"view"` renders the digits as text. */
  mode?: FieldMode;
}
