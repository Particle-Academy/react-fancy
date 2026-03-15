export interface PillboxProps {
  value?: string[];
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  disabled?: boolean;
  className?: string;
}
