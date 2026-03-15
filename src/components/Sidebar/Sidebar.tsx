import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks";
import { SidebarContext } from "./Sidebar.context";
import { SidebarItem } from "./SidebarItem";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarSubmenu } from "./SidebarSubmenu";
import { SidebarToggle } from "./SidebarToggle";
import type { SidebarProps } from "./Sidebar.types";

function SidebarRoot({
  children,
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  collapseMode = "icons",
  className,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useControllableState(
    controlledCollapsed,
    defaultCollapsed,
    onCollapsedChange,
  );

  return (
    <SidebarContext.Provider value={{ collapsed, collapseMode, setCollapsed }}>
      <aside
        data-react-fancy-sidebar=""
        data-collapsed={collapsed || undefined}
        className={cn(
          "flex flex-col gap-0.5 border-r border-zinc-200 bg-white transition-[width] duration-200 dark:border-zinc-700 dark:bg-zinc-900",
          collapsed ? "w-16" : "w-60",
          className,
        )}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}

export const Sidebar = Object.assign(SidebarRoot, {
  Item: SidebarItem,
  Group: SidebarGroup,
  Submenu: SidebarSubmenu,
  Toggle: SidebarToggle,
});
