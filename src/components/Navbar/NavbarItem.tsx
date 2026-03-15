import { cn } from "../../utils/cn";
import type { NavbarItemProps } from "./Navbar.types";

export function NavbarItem({
  children,
  href,
  active = false,
  className,
}: NavbarItemProps) {
  const baseClass = cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
    className,
  );

  if (href) {
    return (
      <a data-react-fancy-navbar-item="" href={href} className={baseClass}>
        {children}
      </a>
    );
  }

  return <div data-react-fancy-navbar-item="" className={baseClass}>{children}</div>;
}

NavbarItem.displayName = "NavbarItem";
