import { cn } from "../../utils/cn";
import type { DrawerBodyProps } from "./Drawer.types";

export function DrawerBody({ children, className }: DrawerBodyProps) {
  return (
    <div
      data-react-fancy-drawer-body=""
      className={cn("min-h-0 flex-1 overflow-auto px-4 py-3 text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]", className)}
    >
      {children}
    </div>
  );
}

DrawerBody.displayName = "DrawerBody";
