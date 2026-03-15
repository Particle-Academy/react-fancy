import type { ReactNode } from "react";

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

export interface TableProps {
  children: ReactNode;
  className?: string;
}

export interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

export interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export interface TableRowProps {
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

export interface TableCellProps {
  children: ReactNode;
  className?: string;
  header?: boolean;
}

export interface TableColumnProps {
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
