import { useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { KanbanContext } from "./Kanban.context";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import type { KanbanProps } from "./Kanban.types";

/**
 * Kanban board component (experimental).
 * Uses HTML5 Drag and Drop API.
 */
function KanbanRoot({ children, onCardMove, className }: KanbanProps) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);

  const ctx = useMemo(
    () => ({ onCardMove, draggedCard, setDraggedCard, dragSource, setDragSource }),
    [onCardMove, draggedCard, dragSource],
  );

  return (
    <KanbanContext.Provider value={ctx}>
      <div data-react-fancy-kanban="" className={cn("flex gap-4 overflow-x-auto p-4", className)}>
        {children}
      </div>
    </KanbanContext.Provider>
  );
}

export const Kanban = Object.assign(KanbanRoot, {
  Column: KanbanColumn,
  Card: KanbanCard,
});
