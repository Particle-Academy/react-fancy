import type { ReactNode } from "react";

export interface KanbanContextValue {
  onCardMove?: (
    cardId: string,
    fromColumn: string,
    toColumn: string,
  ) => void;
  draggedCard: string | null;
  setDraggedCard: (id: string | null) => void;
  dragSource: string | null;
  setDragSource: (id: string | null) => void;
}

export interface KanbanProps {
  children: ReactNode;
  onCardMove?: (
    cardId: string,
    fromColumn: string,
    toColumn: string,
  ) => void;
  className?: string;
}

export interface KanbanColumnProps {
  children: ReactNode;
  id: string;
  title?: string;
  className?: string;
}

export interface KanbanCardProps {
  children: ReactNode;
  id: string;
  className?: string;
}
