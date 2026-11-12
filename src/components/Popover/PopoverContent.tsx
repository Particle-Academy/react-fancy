import { useCallback, useEffect, useRef } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { usePopover } from "./Popover.context";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import type { PopoverContentProps } from "./Popover.types";

export function PopoverContent({ children, className, style, ...rest }: PopoverContentProps) {
  const {
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
  } = usePopover();
  const outsideRef = useRef<HTMLDivElement>(null);

  // An id the caller gave the panel is the one the trigger's aria-controls
  // must name.
  const ownId = rest.id;
  useEffect(() => {
    if (ownId === undefined) return;
    setContentId(ownId);
    return () => setContentId(undefined);
  }, [ownId, setContentId]);

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
        {...rest}
        // The panel is the element in <body>, so it carries the popup's role
        // itself (axe "region" exempts a dialog). A caller's own role wins:
        // pass role="menu" with haspopup="menu" on the Popover for a menu.
        role={rest.role ?? "dialog"}
        id={contentId}
        ref={(node) => {
          outsideRef.current = node;
          (floatingRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        data-react-fancy-popover=""
        className={cn(
          "fixed z-50 rounded-xl border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] p-4 text-zinc-700 shadow-lg dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-zinc-200 dark:shadow-zinc-950/50",
          positioned ? "fancy-scale-in" : "invisible",
          className,
        )}
        dir={rest.dir ?? position.dir}
        style={{ ...style, left: position.x, top: position.y }}
        onMouseEnter={hover ? onHoverEnter : undefined}
        onMouseLeave={hover ? onHoverLeave : undefined}
      >
        {children}
      </div>
    </Portal>
  );
}

PopoverContent.displayName = "PopoverContent";
