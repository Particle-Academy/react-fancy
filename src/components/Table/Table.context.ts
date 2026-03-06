import { createContext, useContext } from "react";
import type { TableContextValue } from "./Table.types";

export const TableContext = createContext<TableContextValue | null>(null);

export function useTable(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) {
    throw new Error("Table compound components must be used within <Table>");
  }
  return ctx;
}
