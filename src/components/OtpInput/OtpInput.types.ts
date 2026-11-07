import type { FieldMode } from "../inputs/inputs.types";

/** Words read to screen readers, for translation. */
export interface OtpInputLabels {
  /** Each cell's name. `{n}` is its position, `{total}` the code length. @default "Digit {n} of {total}" */
  digit?: string;
}

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** `"edit"` (default) renders the inputs; `"view"` renders the digits as text. */
  mode?: FieldMode;
  /** Accessible name of the group of cells. Ignored when `aria-labelledby` is given. @default "Verification code" */
  label?: string;
  /** Id of a visible element naming the group; wins over `label`. */
  "aria-labelledby"?: string;
  /** Cell names, for translation. */
  labels?: OtpInputLabels;
}
