import { useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { usePopover } from "./Popover.context";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useAnimation } from "../../hooks/use-animation";
import type { PopoverContentProps } from "./Popover.types";

export function PopoverContent({ children, className }: PopoverContentProps) {
  const { open, setOpen, anchorRef, placement, offset } = usePopover();
  const floatingRef = useRef<HTMLDivElement>(null);
  const outsideRef = useRef<HTMLDivElement>(null);

  const position = useFloatingPosition(anchorRef, floatingRef, {
    placement,
    offset,
    enabled: open,
  });

  const close = useCallback(() => setOpen(false), [setOpen]);
  useOutsideClick(outsideRef, close, open);
  useEscapeKey(close, open);

  const { mounted, className: animClass, ref: animRef } = useAnimation({
    open,
    enterClass: "fancy-scale-in",
    exitClass: "fancy-fade-out",
  });

  if (!mounted) return null;

  return (
    <Portal>
      <div
        ref={(node) => {
          outsideRef.current = node;
          floatingRef.current = node;
          (animRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        data-react-fancy-popover=""
        className={cn(
          "fixed z-50 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:shadow-zinc-950/50",
          animClass,
          className,
        )}
        style={{ left: position.x, top: position.y }}
      >
        {children}
      </div>
    </Portal>
  );
}

PopoverContent.displayName = "PopoverContent";
