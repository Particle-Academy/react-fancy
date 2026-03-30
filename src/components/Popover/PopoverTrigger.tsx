import { cn } from "../../utils/cn";
import { usePopover } from "./Popover.context";
import type { PopoverTriggerProps } from "./Popover.types";

export function PopoverTrigger({ children, className }: PopoverTriggerProps) {
  const { setOpen, open, anchorRef, hover, onHoverEnter, onHoverLeave } = usePopover();

  return (
    <span
      ref={anchorRef as React.RefObject<HTMLSpanElement>}
      data-react-fancy-popover-trigger=""
      className={cn("inline-flex", className)}
      onClick={hover ? undefined : () => setOpen(!open)}
      onMouseEnter={hover ? onHoverEnter : undefined}
      onMouseLeave={hover ? onHoverLeave : undefined}
      aria-expanded={open}
      aria-haspopup
    >
      {children}
    </span>
  );
}

PopoverTrigger.displayName = "PopoverTrigger";
