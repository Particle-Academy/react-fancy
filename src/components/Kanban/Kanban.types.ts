import type { ReactNode } from "react";

/**
 * Fired when a card is dropped into a column. `toIndex` is the position
 * the card should land at within the destination column (0-based;
 * `toIndex === current count` means append).
 *
 * For a same-column reorder, `fromColumn === toColumn` and `toIndex` is
 * the new position.
 */
export type KanbanCardMoveHandler = (
  cardId: string,
  fromColumn: string,
  toColumn: string,
  toIndex: number,
) => void;

/**
 * Fired when a column is dropped at a new position. `toIndex` is the
 * new position among registered columns (0-based).
 */
export type KanbanColumnMoveHandler = (
  columnId: string,
  toIndex: number,
) => void;

export interface KanbanContextValue {
  // Card drag state
  draggedCard: string | null;
  setDraggedCard: (id: string | null) => void;
  dragSource: string | null;
  setDragSource: (id: string | null) => void;

  // Column drag state
  draggedColumn: string | null;
  setDraggedColumn: (id: string | null) => void;

  // Callbacks
  onCardMove?: KanbanCardMoveHandler;
  onColumnMove?: KanbanColumnMoveHandler;

  // Column registration — root tracks order for column-reorder math
  columnIds: string[];
  registerColumn: (id: string) => () => void;
}

export interface KanbanProps {
  children: ReactNode;
  /**
   * Called when a card is dropped into a column. Receives the destination
   * index so handlers can support within-column reorder.
   */
  onCardMove?: KanbanCardMoveHandler;
  /**
   * Called when a column is dropped at a new position. Only fires if at
   * least one column inside the board has a `<Kanban.ColumnHandle>` and
   * a column was actually dragged.
   */
  onColumnMove?: KanbanColumnMoveHandler;
  className?: string;
}

export interface KanbanColumnProps {
  children: ReactNode;
  id: string;
  title?: string;
  className?: string;
  /**
   * Skip the column's default visuals (background, padding, min-height,
   * fixed width). Drop-target wiring and the drag-over ring stay.
   */
  unstyled?: boolean;
  /**
   * Soft work-in-progress limit. Shown in the column header (when `title`
   * is provided) as `count/limit`. Turns red over capacity. Drops are
   * still accepted — enforce hard via the consumer's `onCardMove`.
   */
  wipLimit?: number;
  /**
   * If true, the column renders nothing when it has zero card children.
   * Useful for filter UIs that want clean collapse instead of empty
   * placeholders.
   */
  hideWhenEmpty?: boolean;
}

export interface KanbanCardProps {
  children: ReactNode;
  id: string;
  className?: string;
  /**
   * Skip the card's default visuals (border, padding, shadow). Drag
   * handlers and `draggable` stay.
   */
  unstyled?: boolean;
}

export interface KanbanColumnHandleProps {
  children: ReactNode;
  className?: string;
}
