import { createContext, useContext } from "react";
import type { TreeNavContextValue } from "./TreeNav.types";

export const TreeNavContext = createContext<TreeNavContextValue | null>(null);

export function useTreeNav(): TreeNavContextValue {
  const ctx = useContext(TreeNavContext);
  if (!ctx) {
    throw new Error("useTreeNav must be used within a <TreeNav> component");
  }
  return ctx;
}
