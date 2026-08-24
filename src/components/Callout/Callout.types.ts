import type { HTMLAttributes, ReactNode } from "react";
import type { Color } from "../../utils/types";

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  color?: Color;
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}
