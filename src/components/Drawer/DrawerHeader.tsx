import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useDrawer } from "./Drawer.context";
import type { DrawerHeaderProps } from "./Drawer.types";

export function DrawerHeader({ children, closable = true, className }: DrawerHeaderProps) {
  const { close } = useDrawer();

  return (
    <div
      data-react-fancy-drawer-header=""
      className={cn(
        "flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700",
        className,
      )}
    >
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{children}</div>
      {closable ? (
        <button
          type="button"
          onClick={close}
          className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      ) : null}
    </div>
  );
}

DrawerHeader.displayName = "DrawerHeader";
