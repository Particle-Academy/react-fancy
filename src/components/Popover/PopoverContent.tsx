import { useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { usePopover } from "./Popover.context";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import type { PopoverContentProps } from "./Popover.types";

export function PopoverContent({ children, className }: PopoverContentProps) {
  const { open, setOpen, anchorRef, floatingRef, placement, offset, hover, onHoverEnter, onHoverLeave } = usePopover();
  const outsideRef = useRef<HTMLDivElement>(null);

  const position = useFloatingPosition(anchorRef, floatingRef, {
    placement,
    offset,
    enabled: open,
  });

  const close = useCallback(() => setOpen(false), [setOpen]);
  useOutsideClick(outsideRef, close, open && !hover, anchorRef);
  useEscapeKey(close, open);

  // Hide until position is calculated to prevent flash at (-9999, -9999)
  const positioned = position.x !== -9999 && position.y !== -9999;

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={(node) => {
          outsideRef.current = node;
          (floatingRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        data-react-fancy-popover=""
        className={cn(
          "fixed z-50 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:shadow-zinc-950/50",
          positioned ? "fancy-scale-in" : "invisible",
          className,
        )}
        style={{ left: position.x, top: position.y }}
        onMouseEnter={hover ? onHoverEnter : undefined}
        onMouseLeave={hover ? onHoverLeave : undefined}
      >
        {children}
      </div>
    </Portal>
  );
}

PopoverContent.displayName = "PopoverContent";
