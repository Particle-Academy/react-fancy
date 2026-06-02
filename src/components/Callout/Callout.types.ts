import type { ReactNode } from "react";
import type { Color } from "../../utils/types";

export interface CalloutProps {
  children: ReactNode;
  color?: Color;
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}
