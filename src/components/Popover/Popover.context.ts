import { createContext, useContext } from "react";
import type { PopoverContextValue } from "./Popover.types";

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopover(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) {
    throw new Error("Popover compound components must be used within <Popover>");
  }
  return ctx;
}
