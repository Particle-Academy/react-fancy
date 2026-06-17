import type { ReactNode } from "react";
import type { FieldMode } from "../inputs/inputs.types";

export interface AutocompleteOption {
  value: string;
  label: string;
  disabled?: boolean;
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
