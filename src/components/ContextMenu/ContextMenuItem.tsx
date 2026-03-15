import { cn } from "../../utils/cn";
import { useContextMenu } from "./ContextMenu.context";
import type { ContextMenuItemProps } from "./ContextMenu.types";

export function ContextMenuItem({
  children,
  onClick,
  disabled = false,
  danger = false,
  className,
}: ContextMenuItemProps) {
  const { setOpen } = useContextMenu();

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

ContextMenuItem.displayName = "ContextMenuItem";
