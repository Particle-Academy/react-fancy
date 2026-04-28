import { Children, isValidElement, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { KanbanCard } from "./KanbanCard";
import { useKanban, KanbanColumnContext } from "./Kanban.context";
import type { KanbanColumnProps } from "./Kanban.types";

const DEFAULT_COLUMN_CLASSES =
  "min-h-[200px] w-72 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50";

/**
 * Deep-recurse through the children tree counting Kanban.Card descendants
 * regardless of wrapping (Fragment, ContextMenu, motion.div, custom HOCs,
 * etc.). Used by `hideWhenEmpty` and the WIP-limit count chip.
 */
function countCardChildren(children: React.ReactNode): number {
  let n = 0;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === KanbanCard) {
      n += 1;
      return;
    }
    const inner = (child.props as { children?: React.ReactNode }).children;
    if (inner !== undefined) n += countCardChildren(inner);
  });
  return n;
}

/**
 * Find the document-order index of a Kanban.Card with the given id, deep-
 * recursing through wrappers. Used by same-column reorder to compute the
 * post-removal insert position.
 */
function findCardIndex(children: React.ReactNode, cardId: string): number {
  let idx = -1;
  let i = 0;
  function walk(nodes: React.ReactNode): void {
    Children.forEach(nodes, (child) => {
      if (idx !== -1) return;
      if (!isValidElement(child)) return;
      if (child.type === KanbanCard) {
        if ((child.props as { id?: string }).id === cardId) idx = i;
        i += 1;
        return;
      }
      const inner = (child.props as { children?: React.ReactNode }).children;
      if (inner !== undefined) walk(inner);
    });
  }
  walk(children);
  return idx;
}

export function KanbanColumn({
  children,
  id,
  title,
  className,
  unstyled,
  wipLimit,
  hideWhenEmpty,
}: KanbanColumnProps) {
  const { onCardMove, draggedCard, dragSource, registerColumn } = useKanban();
  const [dragOver, setDragOver] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dropY, setDropY] = useState<number | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => registerColumn(id), [id, registerColumn]);

  /**
   * Compute drop position from mouse Y. Walks the *DOM* (not the React
   * tree) and queries `[data-react-fancy-kanban-card]` so wrappers
   * (ContextMenu, custom Card surfaces, motion.div) don't break the
   * indicator placement.
   */
  const updateDrop = useCallback((clientY: number) => {
    const container = cardsRef.current;
    if (!container) {
      setDropIndex(null);
      setDropY(null);
      return;
    }

    // Limit to cards belonging to THIS column — important if a card
    // happens to nest a sub-board (rare, but cheap to defend).
    const all = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-react-fancy-kanban-card]",
      ),
    );
    const cards = all.filter(
      (el) =>
        el.closest("[data-react-fancy-kanban-column]") ===
        cardsRef.current?.closest("[data-react-fancy-kanban-column]"),
    );

    const containerRect = container.getBoundingClientRect();

    if (cards.length === 0) {
      setDropIndex(0);
      setDropY(0);
      return;
    }

    let idx = cards.length;
    let yRel = 0;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i]!.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        idx = i;
        yRel = rect.top - containerRect.top;
        break;
      }
    }
    if (idx === cards.length) {
      const last = cards[cards.length - 1]!.getBoundingClientRect();
      yRel = last.bottom - containerRect.top;
    }

    setDropIndex(idx);
    setDropY(yRel);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      // Only react to card drags. Column drags are handled by the root.
      if (!draggedCard) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
      updateDrop(e.clientY);
    },
    [draggedCard, updateDrop],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
    setDropIndex(null);
    setDropY(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!draggedCard) return;
      e.preventDefault();
      e.stopPropagation();
      const target = dropIndex ?? 0;

      if (dragSource) {
        let finalIdx = target;
        if (dragSource === id) {
          const srcIdx = findCardIndex(children, draggedCard);
          if (srcIdx !== -1 && target > srcIdx) finalIdx = target - 1;
          if (srcIdx === finalIdx) {
            // No-op
            setDragOver(false);
            setDropIndex(null);
            setDropY(null);
            return;
          }
        }
        onCardMove?.(draggedCard, dragSource, id, finalIdx);
      }

      setDragOver(false);
      setDropIndex(null);
      setDropY(null);
    },
    [draggedCard, dragSource, dropIndex, id, onCardMove, children],
  );

  const cardCount = countCardChildren(children);
  if (hideWhenEmpty && cardCount === 0 && !draggedCard) return null;

  const showIndicator =
    draggedCard !== null &&
    dropIndex !== null &&
    dropY !== null &&
    dragOver;

  const overWip = wipLimit !== undefined && cardCount > wipLimit;

  return (
    <KanbanColumnContext.Provider value={id}>
      <div
        data-react-fancy-kanban-column=""
        data-column-id={id}
        role="group"
        aria-label={title}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex flex-col",
          !unstyled && DEFAULT_COLUMN_CLASSES,
          dragOver && "ring-2 ring-blue-400 ring-inset",
          className,
        )}
      >
        {title && (
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="flex-1">{title}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                overWip
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
              )}
            >
              {cardCount}
              {wipLimit !== undefined ? `/${wipLimit}` : ""}
            </span>
          </h3>
        )}

        {/* Cards container — `relative` so the drop indicator overlay
            can position itself in the container's coordinate space.
            Children are rendered untouched so any wrapper hierarchy
            (ContextMenu, motion.div, etc.) keeps working. */}
        <div ref={cardsRef} className="relative flex flex-1 flex-col gap-2">
          {children}

          {showIndicator && (
            <div
              data-react-fancy-kanban-drop-indicator=""
              style={{ top: dropY }}
              className="pointer-events-none absolute left-0 right-0 h-0.5 -translate-y-1/2 rounded-full bg-blue-500/80 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
            />
          )}
        </div>
      </div>
    </KanbanColumnContext.Provider>
  );
}

KanbanColumn.displayName = "KanbanColumn";
