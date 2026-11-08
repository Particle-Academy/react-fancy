import type { InputBaseProps } from "../inputs/inputs.types";

/** Words read to screen readers, for translation. `{tag}` is the pill's text. */
export interface PillboxLabels {
  /** Each pill's remove button. @default "Remove {tag}" */
  remove?: string;
  /** Announced when a pill is added. @default "Added {tag}" */
  added?: string;
  /** Announced when a pill is removed. @default "Removed {tag}" */
  removed?: string;
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
  disabled?: boolean;
  className?: string;
  /** Remove-button names and add / remove announcements, for translation. */
  labels?: PillboxLabels;
}
