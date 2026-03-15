import { useMemo, useRef, useState } from "react";
import { ContextMenuContext } from "./ContextMenu.context";
import { ContextMenuTrigger } from "./ContextMenuTrigger";
import { ContextMenuContent } from "./ContextMenuContent";
import { ContextMenuItem } from "./ContextMenuItem";
import { ContextMenuSeparator } from "./ContextMenuSeparator";
import type { ContextMenuProps } from "./ContextMenu.types";

function ContextMenuRoot({ children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const positionRef = useRef({ x: 0, y: 0 });

  const ctx = useMemo(
    () => ({ open, setOpen, position: positionRef.current }),
    [open],
  );

  return (
    <ContextMenuContext.Provider value={ctx}>
      {children}
    </ContextMenuContext.Provider>
  );
}

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
});
