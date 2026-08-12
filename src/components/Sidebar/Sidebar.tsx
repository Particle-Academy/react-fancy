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
  embedded = false,
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
        data-embedded={embedded || undefined}
        className={cn(
          "flex flex-col gap-0.5 transition-[width] duration-200",
          // The app-shell chrome. Correct for the rail this is usually used as,
          // and actively wrong inside a container that already draws its own —
          // a 240px rail in a 300px card puts its right border 240px in, which
          // reads as a stray line slicing the panel rather than an edge.
          !embedded && "border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
          // Collapsed is a fixed icon rail either way; only the expanded width
          // defers to the container.
          collapsed ? "w-16" : embedded ? "w-full" : "w-60",
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
