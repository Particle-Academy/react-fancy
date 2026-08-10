import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => ReactNode;
}

export interface TableContextValue {
  sortKey: string | null;
  sortDir: "asc" | "desc";
  toggleSort: (key: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  totalRows: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export interface TableProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
}

export interface TableRowProps
  extends Omit<HTMLAttributes<HTMLTableRowElement>, "onClick"> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  tray?: ReactNode;
  trayTriggerPosition?: "start" | "end" | "hidden";
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export interface TableRowTrayProps {
  children: ReactNode;
  className?: string;
}

/**
 * Extends the native cell attributes so `colSpan`/`rowSpan` (full-span
 * empty-state rows, trays) plus `onClick`, `style`, `scope`, `data-*`, etc. are
 * forwarded onto the underlying `<td>`/`<th>` instead of silently dropped.
 */
export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Render a `<th>` header cell instead of a `<td>`. */
  header?: boolean;
}

/**
 * Extends the native `<th>` attributes so `scope`, `colSpan`, `data-*` and
 * `aria-*` reach the header cell instead of being dropped.
 *
 * `aria-sort` is the one worth calling out: it is emitted automatically from
 * the column's own sort state, and passing it explicitly overrides that — which
 * is what a server-sorted table needs, since it knows its state and the
 * component does not.
 */
export interface TableColumnProps extends ThHTMLAttributes<HTMLTableCellElement> {
  label: string;
  sortKey?: string;
  className?: string;
}

export interface TablePaginationProps {
  className?: string;
  total: number;
  pageSize?: number;
}

export interface TableSearchProps {
  className?: string;
  placeholder?: string;
}

export interface TableTrayProps {
  children: ReactNode;
  className?: string;
}
