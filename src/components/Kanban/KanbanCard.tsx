import { useCallback } from "react";
import { cn } from "../../utils/cn";
import { useKanban, useKanbanColumn } from "./Kanban.context";
import type { KanbanCardProps } from "./Kanban.types";

export function KanbanCard({ children, id, className }: KanbanCardProps) {
  const { setDraggedCard, setDragSource } = useKanban();
  const columnId = useKanbanColumn();

  const handleDragStart = useCallback(() => {
    setDraggedCard(id);
    setDragSource(columnId);
  }, [id, columnId, setDraggedCard, setDragSource]);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setDragSource(null);
  }, [setDraggedCard, setDragSource]);

  return (
    <div
      data-react-fancy-kanban-card=""
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

KanbanCard.displayName = "KanbanCard";
