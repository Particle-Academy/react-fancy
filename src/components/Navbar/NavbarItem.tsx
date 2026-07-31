import type { ElementType } from "react";
import { cn } from "../../utils/cn";
import type { NavbarItemProps } from "./Navbar.types";

export function NavbarItem({
  children,
  href,
  as: As,
  active = false,
  className,
  ...rest
}: NavbarItemProps) {
  const baseClass = cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
    className,
  );

  // Link mode engages on `href` OR `as`: a `to`-based router (TanStack Router,
  // React Router) passes no href, and without this the item fell through to the
  // inert <div> below — a nav entry that renders correctly and navigates nowhere.
  if (href || As) {
    const Link = (As ?? "a") as ElementType;

    // `href` is spread only when set. Passing `href={undefined}` to a `to`-based
    // router's Link overwrites the href it derives for itself, which renders an
    // anchor with no destination.
    return (
      <Link
        data-react-fancy-navbar-item=""
        {...(href ? { href } : {})}
        className={baseClass}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  return (
    <div data-react-fancy-navbar-item="" className={baseClass} {...rest}>
      {children}
    </div>
  );
}

NavbarItem.displayName = "NavbarItem";
