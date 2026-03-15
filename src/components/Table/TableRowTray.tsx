import { cn } from "../../utils/cn";
import type { TableRowTrayProps } from "./Table.types";

export function TableRowTray({ children, className }: TableRowTrayProps) {
  return (
    <div
      data-react-fancy-table-row-tray=""
      className={cn(
        "border-t border-zinc-200 px-4 py-3 dark:border-zinc-700",
        className,
      )}
    >
      {children}
    </div>
  );
}
