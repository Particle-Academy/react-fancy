import { createContext, useContext } from "react";
import type { NavbarContextValue } from "./Navbar.types";

export const NavbarContext = createContext<NavbarContextValue | null>(null);

export function useNavbar(): NavbarContextValue {
  const ctx = useContext(NavbarContext);
  if (!ctx) {
    throw new Error("Navbar compound components must be used within <Navbar>");
  }
  return ctx;
}
