import type { ElementType } from "react";
import { cn } from "../../utils/cn";
import { useMobileMenu } from "./MobileMenu.context";
import type { MobileMenuItemProps } from "./MobileMenu.types";

export function MobileMenuItem({
  children,
  href,
  as: As,
  icon,
  active = false,
  disabled = false,
  badge,
  onClick,
  className,
  ...rest
}: MobileMenuItemProps) {
  const { variant } = useMobileMenu();
  const isBottomBar = variant === "bottom-bar";

  // See NavigableProps: link mode engages on `href` OR `as`. Keeping `onClick`
  // in link mode matters most here — a mobile item usually has to close the menu
  // as well as navigate, and it was silently dropped.
  const isLink = Boolean(href || As);
  const Tag = isLink ? ((As ?? "a") as ElementType) : "button";
  const tagProps = isLink
    ? { ...(href ? { href } : {}), onClick }
    : { type: "button" as const, onClick };

  if (isBottomBar) {
    return (
      <Tag
        {...tagProps}
        {...rest}
        data-react-fancy-mobile-menu-item=""
        data-active={active || undefined}
        aria-current={active ? "page" : undefined}
        aria-disabled={disabled || undefined}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
          active
            ? "text-blue-600 dark:text-blue-400"
            : "text-[color:var(--fancy-text-muted,var(--color-zinc-500))] hover:text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))] dark:hover:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]",
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
      {...rest}
      data-react-fancy-mobile-menu-item=""
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        active
          ? "bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] text-[color:var(--fancy-text,var(--color-zinc-900))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]"
          : "text-[color:var(--fancy-text-subtle,var(--color-zinc-600))] hover:bg-[color:var(--fancy-surface-hover,var(--color-zinc-50))] hover:text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-subtle-dark,var(--color-zinc-400))] dark:hover:bg-[color:var(--fancy-surface-hover-dark,color-mix(in_oklab,var(--color-zinc-800)_50%,transparent))] dark:hover:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]",
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
