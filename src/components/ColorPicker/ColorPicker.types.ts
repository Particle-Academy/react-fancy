export interface ColorPickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  presets?: string[];
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "filled";
  disabled?: boolean;
  className?: string;
}
