import { useCallback, type MouseEvent } from "react";
import { cn } from "../../utils/cn";
import { useContextMenu } from "./ContextMenu.context";
import { directionOf } from "../../utils/direction";
import type { ContextMenuTriggerProps } from "./ContextMenu.types";

export function ContextMenuTrigger({
  children,
  className,
}: ContextMenuTriggerProps) {
  const ctx = useContextMenu();

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      ctx.position.x = e.clientX;
      ctx.position.y = e.clientY;
      // Read here, at the trigger: the menu is portalled to <body>, where a
      // `dir` set on a wrapper rather than on <html> would not reach it.
      ctx.position.dir = directionOf(e.currentTarget as Element);
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
