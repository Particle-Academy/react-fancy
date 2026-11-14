import { Children, isValidElement, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { TableContext } from "./Table.context";
import { TableHead } from "./TableHead";
import { TableBody } from "./TableBody";
import { TableFoot } from "./TableFoot";
import { TableRow } from "./TableRow";
import { TableCell } from "./TableCell";
import { TableColumn } from "./TableColumn";
import { TablePagination } from "./TablePagination";
import { TableSearch } from "./TableSearch";
import { TableTray } from "./TableTray";
import { TableRowTray } from "./TableRowTray";
import type { TableProps, TableContextValue } from "./Table.types";

function TableRoot({ children, className, ...rest }: TableProps) {
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
      <div
        {...rest}
        data-react-fancy-table=""
        className={cn("relative overflow-hidden rounded-lg border border-[color:var(--fancy-border,var(--color-zinc-200))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]", className)}
      >
        {splitTableChildren(children)}
      </div>
    </TableContext.Provider>
  );
}

/**
 * Where a child goes inside the `<table>`, in the order HTML requires
 * (caption, colgroup, thead, tbody, tfoot), or `-1` for anything that is not a
 * table part (Search, Pagination, a toolbar), which stays around the table.
 * Up to 6.25.0 only Head and Body went inside: a `<tfoot>`, `<caption>` or
 * `<colgroup>` landed in the wrapper `<div>`, which is invalid markup.
 */
function tablePartRank(child: ReactNode): number {
  if (!isValidElement(child)) return -1;
  const t = child.type;
  if (t === "caption") return 0;
  if (t === "colgroup") return 1;
  if (t === TableHead || t === "thead") return 2;
  if (t === TableBody || t === "tbody") return 3;
  if (t === TableFoot || t === "tfoot") return 4;
  return -1;
}

function splitTableChildren(children: ReactNode): ReactNode {
  const before: ReactNode[] = [];
  const inside: Array<{ rank: number; child: ReactNode }> = [];
  const after: ReactNode[] = [];

  Children.forEach(children, (child) => {
    const rank = tablePartRank(child);
    if (rank >= 0) {
      inside.push({ rank, child });
      return;
    }
    (inside.length > 0 ? after : before).push(child);
  });

  // Stable: parts of one kind (several bodies) keep the order they were written in.
  const parts = inside.map((p, i) => ({ ...p, i })).sort((a, b) => a.rank - b.rank || a.i - b.i);

  return (
    <>
      {before}
      {parts.length > 0 && <table className="w-full border-collapse">{parts.map((p) => p.child)}</table>}
      {after}
    </>
  );
}

export const Table = Object.assign(TableRoot, {
  Head: TableHead,
  Body: TableBody,
  Foot: TableFoot,
  Row: TableRow,
  Cell: TableCell,
  Column: TableColumn,
  Pagination: TablePagination,
  Search: TableSearch,
  Tray: TableTray,
  RowTray: TableRowTray,
});
