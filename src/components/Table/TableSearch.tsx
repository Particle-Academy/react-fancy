import { cn } from "../../utils/cn";
import { useTable } from "./Table.context";
import type { TableSearchProps } from "./Table.types";

export function TableSearch({
  className,
  placeholder = "Search...",
}: TableSearchProps) {
  const { searchQuery, setSearchQuery } = useTable();

  return (
    <input
      data-react-fancy-table-search=""
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800",
        className,
      )}
    />
  );
}
