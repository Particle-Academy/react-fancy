import type { ReactNode } from "react";
import type { NavigableProps } from "../../utils/types";

export type MobileMenuVariant = "flyout" | "bottom-bar";
export type MobileMenuSide = "left" | "right";

export interface MobileMenuProps {
  children: ReactNode;
  variant?: MobileMenuVariant;
  className?: string;
}

export interface MobileMenuFlyoutProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  side?: MobileMenuSide;
  title?: string;
  className?: string;
}

export interface MobileMenuBottomBarProps {
  children: ReactNode;
  className?: string;
}

export interface MobileMenuItemProps extends NavigableProps {
  children: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface MobileMenuContextValue {
  variant: MobileMenuVariant;
}
