import { useRef } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks";
import { SidebarContext } from "./Sidebar.context";
import { useSidebarKeyboardNav } from "./Sidebar.keyboard";
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
  navLabel,
  keyboardNav = false,
  className,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useControllableState(
    controlledCollapsed,
    defaultCollapsed,
    onCollapsedChange,
  );
  const rootRef = useRef<HTMLElement>(null);
  const onKeyDown = useSidebarKeyboardNav(rootRef, keyboardNav);

  return (
    <SidebarContext.Provider value={{ collapsed, collapseMode, setCollapsed, keyboardNav }}>
      <aside
        ref={rootRef}
        onKeyDown={onKeyDown}
        data-react-fancy-sidebar=""
        data-collapsed={collapsed || undefined}
        data-embedded={embedded || undefined}
        className={cn(
          "flex flex-col gap-0.5 transition-[width] duration-200",
          // The app-shell chrome. Correct for the rail this is usually used as,
          // and actively wrong inside a container that already draws its own —
          // a 240px rail in a 300px card puts its right border 240px in, which
          // reads as a stray line slicing the panel rather than an edge.
          !embedded && "border-r border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
          // Collapsed is a fixed icon rail either way; only the expanded width
          // defers to the container.
          collapsed ? "w-16" : embedded ? "w-full" : "w-60",
          className,
        )}
      >
        {navLabel ? (
          // The <aside> is a complementary landmark, not a navigation one, so
          // without this a screen reader's landmark list shows no navigation.
          // Opt-in: an element between the <aside> and its children is a DOM
          // change a consumer's CSS (`aside > a`) or tests may depend on. The
          // <nav> takes over the column layout and fills the rail, so a footer
          // pushed down with `mt-auto` still reaches the bottom.
          <nav
            data-react-fancy-sidebar-nav=""
            aria-label={navLabel}
            className="flex min-h-0 flex-1 flex-col gap-0.5"
          >
            {children}
          </nav>
        ) : (
          children
        )}
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
