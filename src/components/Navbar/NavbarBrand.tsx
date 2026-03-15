import { cn } from "../../utils/cn";
import type { NavbarBrandProps } from "./Navbar.types";

export function NavbarBrand({ children, className }: NavbarBrandProps) {
  return (
    <div data-react-fancy-navbar-brand="" className={cn("flex items-center", className)}>{children}</div>
  );
}

NavbarBrand.displayName = "NavbarBrand";
