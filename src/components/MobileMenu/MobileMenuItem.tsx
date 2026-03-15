import { cn } from "../../utils/cn";
import { useMobileMenu } from "./MobileMenu.context";
import type { MobileMenuItemProps } from "./MobileMenu.types";

export function MobileMenuItem({
  children,
  href,
  icon,
  active = false,
  disabled = false,
  badge,
  onClick,
  className,
}: MobileMenuItemProps) {
  const { variant } = useMobileMenu();
  const isBottomBar = variant === "bottom-bar";

  const Tag = href ? "a" : "button";
  const tagProps = href ? { href } : { type: "button" as const, onClick };

  if (isBottomBar) {
    return (
      <Tag
        {...tagProps}
        data-react-fancy-mobile-menu-item=""
        data-active={active || undefined}
        aria-current={active ? "page" : undefined}
        aria-disabled={disabled || undefined}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
          active
            ? "text-blue-600 dark:text-blue-400"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        {icon && <span className="flex h-5 w-5 items-center justify-center">{icon}</span>}
        <span className="truncate">{children}</span>
        {badge && <span className="absolute right-1 top-0.5">{badge}</span>}
      </Tag>
    );
  }

  // Flyout variant — same as a vertical menu item
  return (
    <Tag
      {...tagProps}
      data-react-fancy-mobile-menu-item=""
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
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

MobileMenuItem.displayName = "MobileMenuItem";
