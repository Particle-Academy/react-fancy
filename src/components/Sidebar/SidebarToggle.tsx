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
        "hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
        className,
      )}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </button>
  );
}

SidebarToggle.displayName = "SidebarToggle";
