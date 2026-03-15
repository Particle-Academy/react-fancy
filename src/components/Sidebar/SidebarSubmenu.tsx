import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { useSidebar } from "./Sidebar.context";
import type { SidebarSubmenuProps } from "./Sidebar.types";

/** Extract first 3 characters from a string. */
function getLetters(label: string): string {
  return label.slice(0, 3);
}

export function SidebarSubmenu({
  children,
  label,
  icon,
  defaultOpen = false,
  className,
}: SidebarSubmenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { collapsed, collapseMode } = useSidebar();

  const showIconOnly = collapsed && collapseMode === "icons" && icon;
  const showLetters = collapsed && (collapseMode === "letters" || (collapseMode === "icons" && !icon));

  // When collapsed, just show the icon/letters as a simple item (no expand)
  if (collapsed) {
    return (
      <div
        data-react-fancy-sidebar-submenu=""
        title={label}
        className={cn(
          "flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
          "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
          "dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
          className,
        )}
      >
        {showIconOnly && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
        )}
        {showLetters && (
          <span className="text-xs font-semibold uppercase">{getLetters(label)}</span>
        )}
      </div>
    );
  }

  return (
    <div data-react-fancy-sidebar-submenu="" className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
          "dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
        )}
      >
        {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-4 border-l border-zinc-200 pl-2 pt-1 dark:border-zinc-700">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

SidebarSubmenu.displayName = "SidebarSubmenu";
