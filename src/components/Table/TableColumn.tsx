import { cn } from "../../utils/cn";
import { useTable } from "./Table.context";
import type { TableColumnProps } from "./Table.types";

export function TableColumn({
  label,
  sortKey,
  className,
  "aria-sort": ariaSortProp,
  onClick,
  ...rest
}: TableColumnProps) {
  const { sortKey: currentSort, sortDir, toggleSort } = useTable();
  const isSorted = sortKey != null && currentSort === sortKey;

  /**
   * Announce the sort state to anyone who cannot see the arrow.
   *
   * The component already computed `isSorted` and `sortDir` and spent both on a
   * ▲/▼ glyph, so a sortable table sounded exactly like a static one and
   * activating a header produced no feedback at all.
   *
   * `"none"` is deliberate and is not the same as omitting the attribute: it
   * says "this column sorts, but is not the current key". A non-sortable header
   * gets nothing, because claiming otherwise invites someone to activate an
   * inert control.
   *
   * An explicit `aria-sort` from the caller wins — a server-sorted table knows
   * its own state and this component does not.
   */
  const ariaSort =
    ariaSortProp ?? (sortKey == null ? undefined : isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none");

  return (
    <th
      {...rest}
      data-react-fancy-table-column=""
      aria-sort={ariaSort}
      className={cn(
        "px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400",
        sortKey && "cursor-pointer select-none",
        className,
      )}
      onClick={
        sortKey || onClick
          ? (event) => {
              // Both, in this order. Dropping the caller's handler because the
              // column happens to sort would be the same silent-prop-loss bug
              // this file just fixed one attribute over.
              onClick?.(event);
              if (sortKey) {
                toggleSort(sortKey);
              }
            }
          : undefined
      }
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isSorted && (
          <span aria-hidden="true" className="text-xs">
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </span>
    </th>
  );
}
