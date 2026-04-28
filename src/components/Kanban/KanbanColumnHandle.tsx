import { useCallback } from "react";
import { cn } from "../../utils/cn";
import { useKanban, useKanbanColumn } from "./Kanban.context";
import type { KanbanColumnHandleProps } from "./Kanban.types";

/**
 * Drag handle for column reordering.
 *
 * Mount inside a `Kanban.Column` to make that column draggable. The
 * column's parent `Kanban` listens for the drop and surfaces the new
 * position via `onColumnMove`. Without a handle, columns are static.
 *
 * Typically wrapped around the column header so users grab the title
 * to reorder; can also be a small grip icon.
 */
export function KanbanColumnHandle({
  children,
  className,
}: KanbanColumnHandleProps) {
  const { setDraggedColumn } = useKanban();
  const columnId = useKanbanColumn();

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // Set a dataTransfer payload so the browser permits the drag — some
      // browsers refuse if dataTransfer is empty.
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", columnId);
      e.stopPropagation();
      setDraggedColumn(columnId);
    },
    [columnId, setDraggedColumn],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null);
  }, [setDraggedColumn]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-react-fancy-kanban-column-handle=""
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

KanbanColumnHandle.displayName = "KanbanColumnHandle";
