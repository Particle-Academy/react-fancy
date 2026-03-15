import { cn } from "../../utils/cn";
import { useSidebar } from "./Sidebar.context";
import type { SidebarItemProps } from "./Sidebar.types";

/** Extract first 3 characters from a ReactNode if it's a string. */
function getLetters(children: React.ReactNode): string {
  if (typeof children === "string") return children.slice(0, 3);
  return "...";
}

export function SidebarItem({
  children,
  href,
  icon,
  active = false,
  disabled = false,
  badge,
  onClick,
  className,
}: SidebarItemProps) {
  const { collapsed, collapseMode } = useSidebar();

  const Tag = href ? "a" : "button";
  const tagProps = href ? { href } : { type: "button" as const, onClick };

  const showIconOnly = collapsed && collapseMode === "icons" && icon;
  const showLetters = collapsed && (collapseMode === "letters" || (collapseMode === "icons" && !icon));

  const title = typeof children === "string" ? children : undefined;

  return (
    <Tag
      {...tagProps}
      data-react-fancy-sidebar-item=""
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled || undefined}
      title={collapsed ? title : undefined}
      className={cn(
        "flex items-center rounded-md text-sm font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        collapsed ? "justify-center px-2 py-2" : "gap-2 px-3 py-2",
        active
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {showIconOnly && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      )}
      {showLetters && (
        <span className="text-xs font-semibold uppercase">{getLetters(children)}</span>
      )}
      {!collapsed && (
        <>
          {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>}
          <span className="flex-1 truncate text-left">{children}</span>
          {badge && <span className="shrink-0">{badge}</span>}
        </>
      )}
    </Tag>
  );
}

SidebarItem.displayName = "SidebarItem";
