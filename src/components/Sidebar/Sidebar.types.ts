import type { ReactNode } from "react";
import type { Color, NavigableProps } from "../../utils/types";

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
  /**
   * Wrap the children in `<nav aria-label={navLabel}>`, so the items form a
   * navigation landmark. The root stays an `<aside>`; the `<nav>` sits inside
   * it and takes over the column layout. Omitted (or empty), no `<nav>` is
   * rendered and the markup is exactly what it was before this prop existed.
   */
  navLabel?: string;
  /**
   * Arrow-key movement between items with a roving tabindex: the rail becomes
   * ONE tab stop (the active item, else the first enabled one), and
   * ArrowUp / ArrowDown / Home / End move focus within it. Disabled items and
   * items inside a closed `Sidebar.Submenu` are skipped; a submenu's trigger
   * is part of the sequence. Keys pressed in an input, textarea, select or
   * contenteditable inside the sidebar are never intercepted, and
   * `Sidebar.Toggle` keeps its own tab stop.
   *
   * Opt-in because it changes Tab order: without it every item is its own
   * tab stop, as before.
   * @default false
   */
  keyboardNav?: boolean;
  className?: string;
}

/** Colour of a {@link SidebarItemProps.dot}. `dot={true}` is red. */
export type SidebarDotColor = Color;

export interface SidebarItemProps extends NavigableProps {
  children: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  /**
   * Also render `badge` when the sidebar is collapsed, as an overlay at the
   * corner of the icon (or of the letters). Off by default: a collapsed rail
   * has never shown badges, and a wide badge ("Beta") over a 20px icon is not
   * something to switch on for every existing consumer. Best for short counts.
   * Handle: `data-react-fancy-sidebar-badge`.
   */
  collapsedBadge?: boolean;
  /**
   * A small attention dot at the icon's corner (unread, warning, "needs
   * you"), shown expanded AND collapsed. `true` is red; pass any Badge colour
   * for another. Purely visual: pair it with `dotLabel`. Handle:
   * `data-react-fancy-sidebar-dot`, with `data-color`.
   */
  dot?: boolean | SidebarDotColor;
  /**
   * Screen-reader text for the dot ("3 unread"), rendered visually hidden and
   * appended to the item's accessible name. Ignored without `dot`.
   */
  dotLabel?: string;
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
  /** Whether the root has `keyboardNav` on. */
  keyboardNav?: boolean;
}
