import { cn } from "../../utils/cn";
import { useTable } from "./Table.context";
import type { TableColumnProps } from "./Table.types";

export function TableColumn({ label, sortKey, className }: TableColumnProps) {
  const { sortKey: currentSort, sortDir, toggleSort } = useTable();
  const isSorted = sortKey && currentSort === sortKey;

  return (
    <th
      data-react-fancy-table-column=""
      className={cn(
        "px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400",
        sortKey && "cursor-pointer select-none",
        className,
      )}
      onClick={sortKey ? () => toggleSort(sortKey) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isSorted && (
          <span className="text-xs">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>
        )}
      </span>
    </th>
  );
}
