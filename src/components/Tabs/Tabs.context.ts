import { createContext, useContext } from "react";
import type { TabsContextValue } from "./Tabs.types";

export const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * What a `Tabs.List` tells its tabs about the roving tab stop.
 *
 * `fallback` is the tab that takes `tabIndex=0` when NO tab is active (the
 * controlled value matches none), so the tablist stays reachable by keyboard.
 * `refresh` lets a tab ask the list to re-derive it when the tab changes in a
 * way the list did not render for (disabled toggled, mounted, unmounted).
 */
export interface TabsListContextValue {
  fallback: HTMLElement | null;
  refresh: () => void;
}

export const TabsListContext = createContext<TabsListContextValue | null>(null);

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs compound components must be used within <Tabs>");
  }
  return ctx;
}
