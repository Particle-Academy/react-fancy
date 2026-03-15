import { cloneElement, type ReactElement } from "react";
import { usePopover } from "./Popover.context";
import type { PopoverTriggerProps } from "./Popover.types";

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { setOpen, open, anchorRef } = usePopover();

  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    ref: anchorRef,
    onClick: () => setOpen(!open),
    "aria-expanded": open,
    "aria-haspopup": true,
  });
}

PopoverTrigger.displayName = "PopoverTrigger";
