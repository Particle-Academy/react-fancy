import type { ReactNode } from "react";

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
}
