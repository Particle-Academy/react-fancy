import { createContext, useContext } from "react";
import type { SidebarContextValue } from "./Sidebar.types";

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a <Sidebar> component");
  }
  return ctx;
}
