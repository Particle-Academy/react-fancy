import { cn } from "../../utils/cn";
import type { DrawerFooterProps } from "./Drawer.types";

export function DrawerFooter({ children, className }: DrawerFooterProps) {
  return (
    <div
      data-react-fancy-drawer-footer=""
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 border-t border-[color:var(--fancy-border,var(--color-zinc-200))] px-4 py-3 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

DrawerFooter.displayName = "DrawerFooter";
