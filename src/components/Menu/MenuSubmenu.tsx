import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { useMenu } from "./Menu.context";
import type { MenuSubmenuProps } from "./Menu.types";

export function MenuSubmenu({
  children,
  label,
  icon,
  defaultOpen = false,
  className,
}: MenuSubmenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { orientation } = useMenu();
  const isVertical = orientation === "vertical";

  if (!isVertical) {
    // Horizontal submenus use a hover-based dropdown
    return (
      <div
        data-react-fancy-menu-submenu=""
        className={cn("group relative", className)}
      >
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
            "dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
          )}
        >
          {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>}
          <span>{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
        <div
          className={cn(
            "invisible absolute left-0 top-full z-50 min-w-[180px] pt-1 opacity-0 transition-all",
            "group-hover:visible group-hover:opacity-100",
          )}
        >
          <div className="rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Vertical submenus use accordion-style expand/collapse
  return (
    <div data-react-fancy-menu-submenu="" className={className}>
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

MenuSubmenu.displayName = "MenuSubmenu";
