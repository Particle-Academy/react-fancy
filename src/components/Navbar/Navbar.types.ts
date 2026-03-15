import type { ReactNode } from "react";

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

export interface NavbarItemProps {
  children: ReactNode;
  href?: string;
  active?: boolean;
  className?: string;
}

export interface NavbarToggleProps {
  className?: string;
}
