import type { InputBaseProps } from "../inputs/inputs.types";

/** Words read to screen readers, for translation. `{tag}` is the pill's text. */
export interface PillboxLabels {
  /** Each pill's remove button. @default "Remove {tag}" */
  remove?: string;
  /** Announced when a pill is added. @default "Added {tag}" */
  added?: string;
  /** Announced when a pill is removed. @default "Removed {tag}" */
  removed?: string;
  /**
   * Announced while typing within 5 characters of `maxLength`. `{remaining}`
   * is the count left. @default "{remaining} characters remaining"
   */
  remaining?: string;
}

export interface PillboxProps
  extends Pick<
    InputBaseProps,
    "label" | "labelHidden" | "description" | "error" | "required" | "id"
  > {
  value?: string[];
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  /**
   * Longest pill, in characters (UTF-16 code units, as the native `maxlength`
   * counts). The input stops accepting characters beyond it, a longer value is
   * never added (pasted text included), and the count left is announced within
   * 5 characters of it. Unset means no cap.
   */
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  /** Remove-button names and add / remove announcements, for translation. */
  labels?: PillboxLabels;
}
