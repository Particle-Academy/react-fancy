export interface ProgressProps {
  value?: number;
  max?: number;
  variant?: "bar" | "circular";
  size?: "sm" | "md" | "lg";
  color?: "blue" | "green" | "amber" | "red" | "violet" | "zinc";
  indeterminate?: boolean;
  showValue?: boolean;
  className?: string;
}
