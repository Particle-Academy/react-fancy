import { cn } from "../../utils/cn";
import type { ContextMenuSeparatorProps } from "./ContextMenu.types";

export function ContextMenuSeparator({ className }: ContextMenuSeparatorProps) {
  return (
    <div
      data-react-fancy-context-menu-separator=""
      role="separator"
      className={cn("my-1 h-px bg-[color:var(--fancy-border,var(--color-zinc-200))] dark:bg-[color:var(--fancy-border-dark,var(--color-zinc-700))]", className)}
    />
  );
}

ContextMenuSeparator.displayName = "ContextMenuSeparator";
