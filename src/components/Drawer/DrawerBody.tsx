import { cn } from "../../utils/cn";
import type { DrawerBodyProps } from "./Drawer.types";

export function DrawerBody({ children, className }: DrawerBodyProps) {
  return (
    <div
      data-react-fancy-drawer-body=""
      className={cn("min-h-0 flex-1 overflow-auto px-4 py-3 text-zinc-700 dark:text-zinc-300", className)}
    >
      {children}
    </div>
  );
}

DrawerBody.displayName = "DrawerBody";
