import { useCallback, useState } from "react";
import { cn } from "../../utils/cn";
import { useKanban, KanbanColumnContext } from "./Kanban.context";
import type { KanbanColumnProps } from "./Kanban.types";

export function KanbanColumn({
  children,
  id,
  title,
  className,
}: KanbanColumnProps) {
  const { onCardMove, draggedCard, dragSource } = useKanban();
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (draggedCard && dragSource && dragSource !== id) {
        onCardMove?.(draggedCard, dragSource, id);
      }
    },
    [draggedCard, dragSource, id, onCardMove],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  return (
    <KanbanColumnContext.Provider value={id}>
      <div
        data-react-fancy-kanban-column=""
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex min-h-[200px] w-72 flex-col rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50",
          dragOver && "ring-2 ring-blue-400 ring-inset",
          className,
        )}
      >
        {title && (
          <h3 className="mb-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            {title}
          </h3>
        )}
        <div className="flex flex-1 flex-col gap-2">{children}</div>
      </div>
    </KanbanColumnContext.Provider>
  );
}

KanbanColumn.displayName = "KanbanColumn";
