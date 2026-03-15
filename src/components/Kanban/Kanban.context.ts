import { createContext, useContext } from "react";
import type { KanbanContextValue } from "./Kanban.types";

export const KanbanContext = createContext<KanbanContextValue | null>(null);

export function useKanban(): KanbanContextValue {
  const ctx = useContext(KanbanContext);
  if (!ctx) {
    throw new Error("Kanban compound components must be used within <Kanban>");
  }
  return ctx;
}

export const KanbanColumnContext = createContext<string>("");

export function useKanbanColumn(): string {
  return useContext(KanbanColumnContext);
}
