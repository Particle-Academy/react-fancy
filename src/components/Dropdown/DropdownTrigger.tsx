import { cloneElement, type ReactElement } from "react";
import { useDropdown } from "./Dropdown.context";
import type { DropdownTriggerProps } from "./Dropdown.types";

export function DropdownTrigger({ children }: DropdownTriggerProps) {
  const { setOpen, open, anchorRef } = useDropdown();

  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    ref: anchorRef,
    onClick: () => setOpen(!open),
    "aria-expanded": open,
    "aria-haspopup": "menu",
  });
}

DropdownTrigger.displayName = "DropdownTrigger";
