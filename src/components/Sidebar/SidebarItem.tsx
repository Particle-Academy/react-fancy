import type { ElementType, ReactNode } from "react";
import { cn } from "../../utils/cn";
import { badgeDot } from "../Badge/Badge.colors";
import { useSidebar } from "./Sidebar.context";
import type { SidebarDotColor, SidebarItemProps } from "./Sidebar.types";

/**
 * The surface-coloured ring separates the dot from whatever it sits on (an
 * icon, the active-row fill) in both modes.
 */
const DOT_BASE =
  "pointer-events-none absolute h-2 w-2 rounded-full ring-2 ring-[color:var(--fancy-surface,var(--color-white))] dark:ring-[color:var(--fancy-surface-dark,var(--color-zinc-900))]";

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
  collapsedBadge = false,
  dot,
  dotLabel,
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

  // --- Attention marks (6.1.0). All of this is inert unless `dot` or
  // `collapsedBadge` is passed, so an item without them renders exactly the
  // markup it always did.
  const dotColor: SidebarDotColor | null = dot === true ? "red" : dot || null;
  const showCollapsedBadge = collapsed && collapsedBadge && Boolean(badge);
  const hasMarks = dotColor !== null || showCollapsedBadge;
  const dotLabelEl =
    dotColor && dotLabel ? (
      // The spaces are load-bearing: adjacent inline elements concatenate in
      // the accessible name, so without them it reads "Inbox3 unread".
      <span className="sr-only" data-react-fancy-sidebar-dot-label="">
        {" "}
        {dotLabel}{" "}
      </span>
    ) : null;
  // Collapsed, the item's visible content is only an icon (or an
  // abbreviation), and its name came from `title`. But accname takes CONTENT
  // over `title`, so a dot label or a badge count would become the item's
  // whole name ("3 unread" instead of "Inbox"). A visually hidden copy of the
  // label keeps the name first.
  const needsHiddenLabel = collapsed && (dotLabelEl !== null || showCollapsedBadge);

  const renderMarks = (anchoredToItem: boolean): ReactNode => (
    <>
      {showCollapsedBadge && (
        <span
          data-react-fancy-sidebar-badge=""
          className="pointer-events-none absolute -right-3 -top-2.5 whitespace-nowrap"
        >
          {badge}
        </span>
      )}
      {dotColor && (
        <span
          aria-hidden="true"
          data-react-fancy-sidebar-dot=""
          data-color={dotColor}
          // A collapsed badge takes the top corner; the dot moves to the
          // bottom one rather than hiding under it.
          data-position={showCollapsedBadge ? "bottom" : "top"}
          className={cn(
            DOT_BASE,
            badgeDot[dotColor],
            anchoredToItem
              ? "right-1.5 top-1.5"
              : showCollapsedBadge
                ? "-bottom-0.5 -right-0.5"
                : "-right-0.5 -top-0.5",
          )}
        />
      )}
    </>
  );
  // Marks sit at the icon's corner when there is an icon, at the letters'
  // corner on a lettered rail, and at the item's own corner otherwise.
  const iconClass = cn(
    "flex h-5 w-5 shrink-0 items-center justify-center",
    hasMarks && "relative",
  );

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
          ? "bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] text-[color:var(--fancy-text,var(--color-zinc-900))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]"
          : "text-[color:var(--fancy-text-subtle,var(--color-zinc-600))] hover:bg-[color:var(--fancy-surface-hover,var(--color-zinc-50))] hover:text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-subtle-dark,var(--color-zinc-400))] dark:hover:bg-[color:var(--fancy-surface-hover-dark,color-mix(in_oklab,var(--color-zinc-800)_50%,transparent))] dark:hover:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]",
        disabled && "pointer-events-none opacity-50",
        // Containing block for the visually hidden labels, and for a dot that
        // has no icon to sit on.
        hasMarks && "relative",
        className,
      )}
    >
      {needsHiddenLabel && (
        <span className="sr-only" data-react-fancy-sidebar-label="">
          {children}{" "}
        </span>
      )}
      {collapsed && dotLabelEl}
      {showIconOnly && (
        <span className={iconClass}>
          {icon}
          {renderMarks(false)}
        </span>
      )}
      {showLetters && (
        <span
          className={cn("text-xs font-semibold uppercase", hasMarks && "relative")}
          // The abbreviation would otherwise read as part of the name ("Inb").
          aria-hidden={needsHiddenLabel || undefined}
        >
          {getLetters(children)}
          {renderMarks(false)}
        </span>
      )}
      {!collapsed && (
        <>
          {icon && (
            <span className={iconClass}>
              {icon}
              {renderMarks(false)}
            </span>
          )}
          {!icon && renderMarks(true)}
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
          {dotLabelEl}
          {badge && <span className="shrink-0">{badge}</span>}
        </>
      )}
    </Tag>
  );
}

SidebarItem.displayName = "SidebarItem";
