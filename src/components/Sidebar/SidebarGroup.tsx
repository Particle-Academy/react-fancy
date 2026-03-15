import { cn } from "../../utils/cn";
import { useSidebar } from "./Sidebar.context";
import type { SidebarGroupProps } from "./Sidebar.types";

export function SidebarGroup({ children, label, className }: SidebarGroupProps) {
  const { collapsed } = useSidebar();

  return (
    <div data-react-fancy-sidebar-group="" className={cn("py-1", className)}>
      {label && !collapsed && (
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {label}
        </p>
      )}
      {label && collapsed && (
        <div className="mx-auto mb-1 h-px w-6 bg-zinc-200 dark:bg-zinc-700" />
      )}
      {children}
    </div>
  );
}

SidebarGroup.displayName = "SidebarGroup";
