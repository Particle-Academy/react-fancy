import { createContext, useContext } from "react";
import type { DrawerContextValue } from "./Drawer.types";

export const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error("Drawer compound components must be used within <Drawer>");
  }
  return ctx;
}
