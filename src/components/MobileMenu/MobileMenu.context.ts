import { createContext, useContext } from "react";
import type { MobileMenuContextValue } from "./MobileMenu.types";

export const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function useMobileMenu(): MobileMenuContextValue {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) {
    throw new Error("useMobileMenu must be used within a <MobileMenu> component");
  }
  return ctx;
}
