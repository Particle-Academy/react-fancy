import { cn } from "../../utils/cn";
import type { TableCellProps } from "./Table.types";

export function TableCell({ children, className, header, ...rest }: TableCellProps) {
  const Tag = header ? "th" : "td";
  return (
    <Tag
      data-react-fancy-table-cell=""
      className={cn(
        "px-4 py-3 text-sm",
        header && "text-left font-medium text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
