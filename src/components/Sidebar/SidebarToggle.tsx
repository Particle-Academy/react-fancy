import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../../utils/cn";
import { useSidebar } from "./Sidebar.context";
import type { SidebarToggleProps } from "./Sidebar.types";

export function SidebarToggle({ className }: SidebarToggleProps) {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      data-react-fancy-sidebar-toggle=""
      onClick={() => setCollapsed(!collapsed)}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "flex items-center justify-center rounded-md p-1.5 text-zinc-400 transition-colors",
        "hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] hover:text-zinc-600 dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))] dark:hover:text-zinc-300",
        className,
      )}
    >
      {collapsed ? (
        // The glyph draws the rail on the inline-start side: mirrored in RTL.
        <PanelLeftOpen className="h-4 w-4 rtl:-scale-x-100" />
      ) : (
        <PanelLeftClose className="h-4 w-4 rtl:-scale-x-100" />
      )}
    </button>
  );
}

SidebarToggle.displayName = "SidebarToggle";
