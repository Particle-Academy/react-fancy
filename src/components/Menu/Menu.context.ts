import { createContext, useContext } from "react";
import type { MenuContextValue } from "./Menu.types";

export const MenuContext = createContext<MenuContextValue | null>(null);

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error("useMenu must be used within a <Menu> component");
  }
  return ctx;
}
