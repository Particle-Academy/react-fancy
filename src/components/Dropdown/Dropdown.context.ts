import { createContext, useContext } from "react";
import type { DropdownContextValue } from "./Dropdown.types";

export const DropdownContext = createContext<DropdownContextValue | null>(null);

export function useDropdown(): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error(
      "Dropdown compound components must be used within <Dropdown>",
    );
  }
  return ctx;
}
