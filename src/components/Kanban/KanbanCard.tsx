import { useCallback } from "react";
import { cn } from "../../utils/cn";
import { useKanban, useKanbanColumn } from "./Kanban.context";
import type { KanbanCardProps } from "./Kanban.types";

const DEFAULT_CARD_CLASSES =
  "rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900";

export function KanbanCard({ children, id, className, unstyled }: KanbanCardProps) {
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
        // Drag affordance — kept even when unstyled so users still see grab cursors.
        "cursor-grab active:cursor-grabbing",
        !unstyled && DEFAULT_CARD_CLASSES,
        className,
      )}
    >
      {children}
    </div>
  );
}

KanbanCard.displayName = "KanbanCard";
