import { cn } from "../../utils/cn";
import { useNavbar } from "./Navbar.context";
import type { NavbarItemsProps } from "./Navbar.types";

export function NavbarItems({ children, className }: NavbarItemsProps) {
  const { mobileOpen } = useNavbar();

  return (
    <div
      data-react-fancy-navbar-items=""
      className={cn(
        "items-center gap-1",
        mobileOpen
          ? "flex flex-col border-t border-zinc-200 pt-4 dark:border-zinc-700"
          : "hidden md:flex md:flex-row",
        className,
      )}
    >
      {children}
    </div>
  );
}

NavbarItems.displayName = "NavbarItems";
