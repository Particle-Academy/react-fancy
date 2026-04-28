import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { KanbanContext } from "./Kanban.context";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumnHandle } from "./KanbanColumnHandle";
import type { KanbanProps } from "./Kanban.types";

/**
 * Kanban board.
 *
 * Compound:
 *   <Kanban onCardMove={...} onColumnMove={...}>
 *     <Kanban.Column id="todo" wipLimit={4}>
 *       <Kanban.ColumnHandle>...header...</Kanban.ColumnHandle>  // optional
 *       <Kanban.Card id="...">...</Kanban.Card>
 *     </Kanban.Column>
 *   </Kanban>
 *
 * Cards drag between columns AND within a column. Drop position is
 * computed from mouse Y at hover time and surfaced via the `toIndex`
 * argument on `onCardMove`.
 *
 * Columns drag horizontally to reorder when a `<Kanban.ColumnHandle>`
 * is mounted inside them. The root computes the drop index from
 * mouse X and surfaces it via `onColumnMove`.
 */
function KanbanRoot({
  children,
  onCardMove,
  onColumnMove,
  className,
}: KanbanProps) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const orderRef = useRef<string[]>([]);
  const [columnIds, setColumnIds] = useState<string[]>([]);

  const registerColumn = useCallback((id: string) => {
    if (!orderRef.current.includes(id)) {
      orderRef.current = [...orderRef.current, id];
      setColumnIds(orderRef.current);
    }
    return () => {
      orderRef.current = orderRef.current.filter((x) => x !== id);
      setColumnIds(orderRef.current);
    };
  }, []);

  const ctx = useMemo(
    () => ({
      draggedCard,
      setDraggedCard,
      dragSource,
      setDragSource,
      draggedColumn,
      setDraggedColumn,
      onCardMove,
      onColumnMove,
      columnIds,
      registerColumn,
    }),
    [
      draggedCard,
      dragSource,
      draggedColumn,
      onCardMove,
      onColumnMove,
      columnIds,
      registerColumn,
    ],
  );

  // ── Column-level drop handling ────────────────────────────────────────
  // Root listens only when a column is being dragged. Drop index is
  // computed from mouse X versus each column's horizontal midpoint.
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!draggedColumn) return;
      e.preventDefault();
    },
    [draggedColumn],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!draggedColumn || !containerRef.current) return;
      e.preventDefault();

      const cols = containerRef.current.querySelectorAll<HTMLElement>(
        '[data-react-fancy-kanban-column]',
      );
      const x = e.clientX;
      let dropIdx = cols.length;
      for (let i = 0; i < cols.length; i++) {
        const rect = cols[i]!.getBoundingClientRect();
        if (x < rect.left + rect.width / 2) {
          dropIdx = i;
          break;
        }
      }

      const sourceIdx = columnIds.indexOf(draggedColumn);
      // When moving rightward, dropping at index N visually means landing
      // at N - 1 after the source is removed.
      const finalIdx =
        sourceIdx >= 0 && dropIdx > sourceIdx ? dropIdx - 1 : dropIdx;

      if (finalIdx !== sourceIdx) {
        onColumnMove?.(draggedColumn, finalIdx);
      }
      setDraggedColumn(null);
    },
    [draggedColumn, columnIds, onColumnMove],
  );

  return (
    <KanbanContext.Provider value={ctx}>
      <div
        ref={containerRef}
        data-react-fancy-kanban=""
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="application"
        aria-roledescription="kanban board"
        className={cn("flex gap-4 overflow-x-auto p-4", className)}
      >
        {children}
      </div>
    </KanbanContext.Provider>
  );
}

export const Kanban = Object.assign(KanbanRoot, {
  Column: KanbanColumn,
  Card: KanbanCard,
  ColumnHandle: KanbanColumnHandle,
});
