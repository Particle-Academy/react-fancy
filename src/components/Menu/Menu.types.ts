import type { ReactNode } from "react";

export type MenuOrientation = "horizontal" | "vertical";

export interface MenuProps {
  children: ReactNode;
  orientation?: MenuOrientation;
  className?: string;
}

export interface MenuItemProps {
  children: ReactNode;
  href?: string;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface MenuSubmenuProps {
  children: ReactNode;
  label: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export interface MenuGroupProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export interface MenuContextValue {
  orientation: MenuOrientation;
}
