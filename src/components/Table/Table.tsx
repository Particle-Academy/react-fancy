import { useCallback, useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { TableContext } from "./Table.context";
import { TableHead } from "./TableHead";
import { TableBody } from "./TableBody";
import { TableRow } from "./TableRow";
import { TableCell } from "./TableCell";
import { TableColumn } from "./TableColumn";
import { TablePagination } from "./TablePagination";
import { TableSearch } from "./TableSearch";
import { TableTray } from "./TableTray";
import type { TableProps, TableContextValue } from "./Table.types";

function TableRoot({ children, className }: TableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const ctx = useMemo<TableContextValue>(
    () => ({
      sortKey,
      sortDir,
      toggleSort,
      page,
      setPage,
      pageSize: 10,
      totalRows: 0,
      searchQuery,
      setSearchQuery,
    }),
    [sortKey, sortDir, toggleSort, page, searchQuery],
  );

  return (
    <TableContext.Provider value={ctx}>
      <div className={cn("overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700", className)}>
        {children}
      </div>
    </TableContext.Provider>
  );
}

export const Table = Object.assign(TableRoot, {
  Head: TableHead,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
  Column: TableColumn,
  Pagination: TablePagination,
  Search: TableSearch,
  Tray: TableTray,
});
