import { cn } from "../../utils/cn";
import type { TableCellProps } from "./Table.types";

export function TableCell({ children, className, header }: TableCellProps) {
  const Tag = header ? "th" : "td";
  return (
    <Tag
      data-react-fancy-table-cell=""
      className={cn(
        "px-4 py-3 text-sm",
        header && "text-left font-medium text-zinc-500 dark:text-zinc-400",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
