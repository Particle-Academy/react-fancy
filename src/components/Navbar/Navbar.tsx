import { useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { NavbarContext } from "./Navbar.context";
import { NavbarBrand } from "./NavbarBrand";
import { NavbarItems } from "./NavbarItems";
import { NavbarItem } from "./NavbarItem";
import { NavbarToggle } from "./NavbarToggle";
import type { NavbarProps } from "./Navbar.types";

function NavbarRoot({ children, className }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const ctx = useMemo(
    () => ({ mobileOpen, setMobileOpen }),
    [mobileOpen],
  );

  return (
    <NavbarContext.Provider value={ctx}>
      <nav
        data-react-fancy-navbar=""
        className={cn(
          "border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          {children}
        </div>
      </nav>
    </NavbarContext.Provider>
  );
}

export const Navbar = Object.assign(NavbarRoot, {
  Brand: NavbarBrand,
  Items: NavbarItems,
  Item: NavbarItem,
  Toggle: NavbarToggle,
});
