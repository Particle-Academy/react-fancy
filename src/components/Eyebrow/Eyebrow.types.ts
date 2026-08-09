import type { HTMLAttributes, ReactNode } from "react";

export interface EyebrowProps extends HTMLAttributes<HTMLDivElement> {
  /** The section marker — `"01"`, `"00"`, a roman numeral. Emphasised. */
  num?: ReactNode;
  /** The section name. Rendered after `num` and an em dash. */
  label?: ReactNode;
  /** A second item pushed to the far end of the line. */
  aside?: ReactNode;
  /** Draw the hairline rule under the head. Default `false`. */
  rule?: boolean;
  /** Full control — replaces the `num`/`label` pair, keeping the arrangement. */
  children?: ReactNode;
}
