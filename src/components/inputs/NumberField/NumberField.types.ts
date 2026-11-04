import type { InputHTMLAttributes, ReactNode } from "react";
import type { InputAffixProps, InputBaseProps } from "../inputs.types";

/** Validation messages, for a host working in another language. */
export interface NumberFieldMessages {
  /** The text is not a number. Default: "Enter a number." */
  invalid?: string;
  /** Below `min`. Default: "Must be at least {min}." */
  min?: string;
  /** Above `max`. Default: "Must be at most {max}." */
  max?: string;
  /** Off the `step` grid. Default: "Must be in steps of {step}." */
  step?: string;
}

export interface NumberFieldProps
  extends InputBaseProps,
    InputAffixProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      "size" | "type" | "prefix" | "value" | "defaultValue" | "min" | "max" | "step"
    > {
  /** The number, or `null` when there is none. Blank is `null`, never `0`. */
  value?: number | null;
  /** Starting value when uncontrolled. */
  defaultValue?: number | null;
  /**
   * The number, or `null` when the field is blank or its text is not a number
   * (a partial `-`, `.` or `1e`, or anything else unreadable). Called only when
   * the value actually changes.
   */
  onValueChange?: (value: number | null) => void;
  /**
   * Lowest valid value. A typed value below it is emitted and reported as invalid,
   * not rewritten: "5" may be on its way to "50". The arrow keys stop here.
   */
  min?: number;
  /** Highest valid value. Same rules as `min`. */
  max?: number;
  /**
   * What the arrow keys move by, on a grid counted from `min` (or 0). Declaring it
   * also makes off-grid values invalid. Omitted or `"any"`, the arrows move by 1 and
   * any number is valid.
   */
  step?: number | "any";
  leading?: ReactNode;
  trailing?: ReactNode;
  messages?: NumberFieldMessages;
}
