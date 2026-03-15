import { cn } from "../../utils/cn";
import { useMenu } from "./Menu.context";
import type { MenuItemProps } from "./Menu.types";

export function MenuItem({
  children,
  href,
  icon,
  active = false,
  disabled = false,
  badge,
  onClick,
  className,
}: MenuItemProps) {
  const { orientation } = useMenu();
  const isVertical = orientation === "vertical";

  const Tag = href ? "a" : "button";
  const tagProps = href ? { href } : { type: "button" as const, onClick };

  return (
    <Tag
      {...tagProps}
      data-react-fancy-menu-item=""
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "flex items-center gap-2 rounded-md text-sm font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isVertical ? "w-full px-3 py-2" : "px-3 py-2",
        active
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>}
      <span className="flex-1 truncate text-left">{children}</span>
      {badge && <span className="shrink-0">{badge}</span>}
    </Tag>
  );
}

MenuItem.displayName = "MenuItem";
