import type { ReactNode } from "react";
import type { NavigableProps } from "../../utils/types";

export type SidebarCollapseMode = "icons" | "letters";

export interface SidebarProps {
  /**
   * Render without the app-shell chrome — no right border, no background, and
   * full width instead of the fixed `w-60`.
   *
   * For a sidebar living inside a container that already owns its surface: a
   * card, a panel, a drawer. The defaults are right for the standalone rail and
   * wrong here, and neutralising them from outside takes four `!important`
   * utilities that every host has to rediscover and that rot when the base
   * classes change.
   *
   * Chrome only — collapsing still works, and a collapsed rail keeps its fixed
   * narrow width.
   */
  embedded?: boolean;
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

export interface SidebarItemProps extends NavigableProps {
  children: ReactNode;
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
