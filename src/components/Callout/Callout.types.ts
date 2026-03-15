import type { ReactNode } from "react";

export interface CalloutProps {
  children: ReactNode;
  color?: "blue" | "green" | "amber" | "red" | "zinc";
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}
