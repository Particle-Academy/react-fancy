import type { ReactNode } from "react";
import type { NavigableProps } from "../../utils/types";

export interface NavbarContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export interface NavbarProps {
  children: ReactNode;
  className?: string;
}

export interface NavbarBrandProps {
  children: ReactNode;
  className?: string;
}

export interface NavbarItemsProps {
  children: ReactNode;
  className?: string;
}

export interface NavbarItemProps extends NavigableProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export interface NavbarToggleProps {
  className?: string;
}
