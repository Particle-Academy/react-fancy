import type { ReactNode } from "react";
import type { FieldMode, OptionDir } from "../inputs/inputs.types";

export interface AutocompleteOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** BCP 47 language of `label` (WCAG 3.1.2). Unset renders no attribute. */
  lang?: string;
  /** Direction of `label`; `"auto"` is available. Unset renders no attribute. */
  dir?: OptionDir;
}

export interface AutocompleteProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  loading?: boolean;
  emptyMessage?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** `"edit"` (default) renders the control; `"view"` renders the value as text. */
  mode?: FieldMode;
}
