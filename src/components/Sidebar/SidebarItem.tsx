import type { ElementType } from "react";
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
  as: As,
  icon,
  active = false,
  disabled = false,
  badge,
  onClick,
  className,
  ...rest
}: SidebarItemProps) {
  const { collapsed, collapseMode } = useSidebar();

  // Link mode engages on `href` OR `as` — a `to`-based router (TanStack Router,
  // React Router) passes no href, and would otherwise render a <button> that
  // navigates nowhere. `onClick` now rides along in link mode instead of being
  // dropped: an item that both navigates and closes a drawer is the common case.
  const isLink = Boolean(href || As);
  const Tag = isLink ? ((As ?? "a") as ElementType) : "button";
  const tagProps = isLink
    ? { ...(href ? { href } : {}), onClick }
    : { type: "button" as const, onClick };

  const showIconOnly = collapsed && collapseMode === "icons" && icon;
  const showLetters = collapsed && (collapseMode === "letters" || (collapseMode === "icons" && !icon));

  const title = typeof children === "string" ? children : undefined;

  return (
    <Tag
      {...tagProps}
      {...rest}
      data-react-fancy-sidebar-item=""
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled || undefined}
      title={collapsed ? title : undefined}
      className={cn(
        // `w-full` matters when the Tag is a <button>: form controls size to
        // FIT-CONTENT, not to their parent, so a long label made the item wider
        // than the sidebar and an ancestor clipped the overflow — which reads as
        // a label cut off mid-word rather than an ellipsis. Without this,
        // `min-w-0` on the label below can never engage, because the item is
        // never under width pressure in the first place.
        "flex w-full items-center rounded-md text-sm font-medium transition-colors",
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
          {/*
            `min-w-0` is load-bearing, not tidiness. A flex item defaults to
            `min-width: auto`, which resolves to its MIN-CONTENT width — so with
            `truncate` alone the span refuses to shrink below the full label,
            and the item grows wider than the sidebar instead of ellipsing.
            The overflow then gets clipped by an ancestor, which looks like a
            mid-word cut rather than a truncation.

            Only shows up with labels longer than the sidebar is wide, which is
            why it survived: short nav labels never trigger it.
          */}
          <span className="min-w-0 flex-1 truncate text-left">{children}</span>
          {badge && <span className="shrink-0">{badge}</span>}
        </>
      )}
    </Tag>
  );
}

SidebarItem.displayName = "SidebarItem";
