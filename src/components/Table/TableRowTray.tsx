import { cn } from "../../utils/cn";
import type { TableRowTrayProps } from "./Table.types";

export function TableRowTray({ children, className }: TableRowTrayProps) {
  return (
    <div
      data-react-fancy-table-row-tray=""
      className={cn(
        "border-t border-[color:var(--fancy-border,var(--color-zinc-200))] px-4 py-3 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
