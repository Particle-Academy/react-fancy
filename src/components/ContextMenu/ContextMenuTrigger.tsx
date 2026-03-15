import { useCallback, type MouseEvent } from "react";
import { cn } from "../../utils/cn";
import { useContextMenu } from "./ContextMenu.context";
import type { ContextMenuTriggerProps } from "./ContextMenu.types";

export function ContextMenuTrigger({
  children,
  className,
}: ContextMenuTriggerProps) {
  const ctx = useContextMenu();

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      (ctx as { position: { x: number; y: number } }).position.x = e.clientX;
      (ctx as { position: { x: number; y: number } }).position.y = e.clientY;
      ctx.setOpen(true);
    },
    [ctx],
  );

  return (
    <div data-react-fancy-context-menu-trigger="" onContextMenu={handleContextMenu} className={cn(className)}>
      {children}
    </div>
  );
}

ContextMenuTrigger.displayName = "ContextMenuTrigger";
