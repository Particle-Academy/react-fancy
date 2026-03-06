import { cn } from "../../utils/cn";
import { useTable } from "./Table.context";
import type { TablePaginationProps } from "./Table.types";

export function TablePagination({
  className,
  total,
  pageSize = 10,
}: TablePaginationProps) {
  const { page, setPage } = useTable();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between px-4 py-3 text-sm", className)}>
      <span className="text-zinc-500">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
          className="rounded border px-2 py-1 disabled:opacity-50 dark:border-zinc-600"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => setPage(page + 1)}
          className="rounded border px-2 py-1 disabled:opacity-50 dark:border-zinc-600"
        >
          Next
        </button>
      </div>
    </div>
  );
}
