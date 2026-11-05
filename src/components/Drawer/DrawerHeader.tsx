import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useDrawer } from "./Drawer.context";
import type { DrawerHeaderProps } from "./Drawer.types";

/**
 * The close button draws at 26px (18px icon + `p-1`) and HITS at 44px (WCAG
 * 2.5.5, AAA): a `::before` overhangs it by 9px, inside the header's `py-3`. The
 * look is unchanged; see ModalHeader for why this over a size option.
 */
export function DrawerHeader({ children, closable = true, className, closeLabel = "Close" }: DrawerHeaderProps) {
  const { close } = useDrawer();

  return (
    <div
      data-react-fancy-drawer-header=""
      className={cn(
        "flex shrink-0 items-center justify-between border-b border-[color:var(--fancy-border,var(--color-zinc-200))] px-4 py-3 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]",
        className,
      )}
    >
      <div className="text-sm font-semibold text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]">{children}</div>
      {closable ? (
        <button
          type="button"
          onClick={close}
          data-react-fancy-drawer-close=""
          className="relative rounded-lg p-1 text-zinc-400 before:absolute before:-inset-[9px] before:content-[''] transition-colors hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] hover:text-zinc-600 dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))] dark:hover:text-zinc-300"
          aria-label={closeLabel}
        >
          <X size={18} />
        </button>
      ) : null}
    </div>
  );
}

DrawerHeader.displayName = "DrawerHeader";
