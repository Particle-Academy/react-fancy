import { createContext, useContext } from "react";
import type { TabsContextValue } from "./Tabs.types";

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs compound components must be used within <Tabs>");
  }
  return ctx;
}
