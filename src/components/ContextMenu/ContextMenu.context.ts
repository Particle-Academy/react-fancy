import { createContext, useContext } from "react";
import type { ContextMenuContextValue } from "./ContextMenu.types";

export const ContextMenuContext =
  createContext<ContextMenuContextValue | null>(null);

export function useContextMenu(): ContextMenuContextValue {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error(
      "ContextMenu compound components must be used within <ContextMenu>",
    );
  }
  return ctx;
}
