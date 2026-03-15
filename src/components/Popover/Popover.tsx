import { useMemo, useRef } from "react";
import { useControllableState } from "../../hooks/use-controllable-state";
import { PopoverContext } from "./Popover.context";
import { PopoverTrigger } from "./PopoverTrigger";
import { PopoverContent } from "./PopoverContent";
import type { PopoverProps } from "./Popover.types";

function PopoverRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom",
  offset = 8,
}: PopoverProps) {
  const [open, setOpen] = useControllableState(
    controlledOpen,
    defaultOpen,
    onOpenChange,
  );
  const anchorRef = useRef<HTMLElement>(null);

  const ctx = useMemo(
    () => ({ open, setOpen, anchorRef, placement, offset }),
    [open, setOpen, anchorRef, placement, offset],
  );

  return (
    <PopoverContext.Provider value={ctx}>{children}</PopoverContext.Provider>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
});
