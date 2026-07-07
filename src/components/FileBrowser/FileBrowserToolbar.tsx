import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useFileBrowser } from "./FileBrowser.context";
import type { FileBrowserToolbarProps, FileSortField } from "./FileBrowser.types";

const SORT_FIELDS: { field: FileSortField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "size", label: "Size" },
  { field: "mtime", label: "Modified" },
];

/**
 * Toolbar: client-side name filter (over loaded nodes only — never triggers
 * loads) plus a dirs-first sort control. Clicking the active sort field flips
 * its direction.
 */
export function FileBrowserToolbar({ filterPlaceholder = "Filter", className }: FileBrowserToolbarProps) {
  const { filter, setFilter, sort, setSort } = useFileBrowser();

  return (
    <div
      data-react-fancy-file-browser-toolbar=""
      className={cn(
        "flex items-center gap-2 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-700",
        className,
      )}
    >
      <div
        data-react-fancy-file-browser-filter=""
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-zinc-200 px-2 dark:border-zinc-700"
      >
        <Search size={13} aria-hidden="true" className="shrink-0 text-zinc-400" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={filterPlaceholder}
          aria-label="Filter by name"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-1 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-300"
        />
        {filter !== "" && (
          <button
            type="button"
            aria-label="Clear filter"
            onClick={() => setFilter("")}
            className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div
        data-react-fancy-file-browser-sort=""
        role="group"
        aria-label="Sort"
        className="flex shrink-0 items-center gap-0.5"
      >
        {SORT_FIELDS.map(({ field, label }) => {
          const active = sort.by === field;
          return (
            <button
              key={field}
              type="button"
              data-sort-field={field}
              aria-pressed={active}
              onClick={() =>
                setSort(
                  active
                    ? { by: field, direction: sort.direction === "asc" ? "desc" : "asc" }
                    : { by: field, direction: "asc" },
                )
              }
              className={cn(
                "flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs transition-colors",
                active
                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
              )}
            >
              {label}
              {active &&
                (sort.direction === "asc" ? (
                  <ArrowUp size={11} aria-hidden="true" />
                ) : (
                  <ArrowDown size={11} aria-hidden="true" />
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

FileBrowserToolbar.displayName = "FileBrowserToolbar";
