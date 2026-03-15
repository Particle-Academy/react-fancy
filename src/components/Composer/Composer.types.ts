import type { ReactNode } from "react";

export interface ComposerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  actions?: ReactNode;
  disabled?: boolean;
  className?: string;
}
