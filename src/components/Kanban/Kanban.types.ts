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
  /**
   * Skip the column's default visuals (background, padding, min-height, fixed
   * width) so the consumer can render their own surface around the children.
   * Drop-target behaviour, drag-over ring, and column id wiring are kept.
   */
  unstyled?: boolean;
}

export interface KanbanCardProps {
  children: ReactNode;
  id: string;
  className?: string;
  /**
   * Skip the card's default visuals (border, padding, shadow, hover styles).
   * Drag handlers and the `draggable` attribute remain so a consumer can
   * wrap their own Card / Surface inside.
   */
  unstyled?: boolean;
}
