import { useCallback, useId, useMemo, useRef, useState } from "react";
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
  hover = false,
  hoverDelay = 200,
  hoverCloseDelay = 300,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const anchorRef = useRef<HTMLElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const onHoverEnter = useCallback(() => {
    if (!hover) return;
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setOpen(true), hoverDelay);
  }, [hover, hoverDelay, setOpen]);

  const onHoverLeave = useCallback(() => {
    if (!hover) return;
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setOpen(false), hoverCloseDelay);
  }, [hover, hoverCloseDelay, setOpen]);

  // The content's id: generated, unless Popover.Content was given its own.
  const autoContentId = useId();
  const [customContentId, setContentId] = useState<string | undefined>(undefined);
  const contentId = customContentId ?? autoContentId;

  const ctx = useMemo(
    () => ({
      open,
      setOpen,
      anchorRef,
      floatingRef,
      placement,
      offset,
      hover,
      onHoverEnter,
      onHoverLeave,
      contentId,
      setContentId,
    }),
    [open, setOpen, placement, offset, hover, onHoverEnter, onHoverLeave, contentId],
  );

  return (
    <PopoverContext.Provider value={ctx}>{children}</PopoverContext.Provider>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
});
