import type { ReactNode } from "react";

export type SidebarCollapseMode = "icons" | "letters";

export interface SidebarProps {
  children: ReactNode;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * How items display when collapsed:
   * - `"icons"` — show only the icon (falls back to first 3 letters if no icon)
   * - `"letters"` — show the first 3 letters of the label
   * @default "icons"
   */
  collapseMode?: SidebarCollapseMode;
  className?: string;
}

export interface SidebarItemProps {
  children: ReactNode;
  href?: string;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface SidebarGroupProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export interface SidebarToggleProps {
  className?: string;
}

export interface SidebarSubmenuProps {
  children: ReactNode;
  label: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export interface SidebarContextValue {
  collapsed: boolean;
  collapseMode: SidebarCollapseMode;
  setCollapsed: (collapsed: boolean) => void;
}
