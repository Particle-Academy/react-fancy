import { Children, Fragment, isValidElement, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { KanbanCard } from "./KanbanCard";
import { useKanban, KanbanColumnContext } from "./Kanban.context";
import type { KanbanColumnProps } from "./Kanban.types";

const DEFAULT_COLUMN_CLASSES =
  "min-h-[200px] w-72 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50";

/**
 * Count direct Kanban.Card descendants in the children tree. Used by
 * `hideWhenEmpty` and `wipLimit` to know how many real cards live in
 * the column without conflating decorative children (column handles,
 * headers, etc.).
 */
function countCardChildren(children: React.ReactNode): number {
  let n = 0;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    // Walk one level deep — Kanban.Card may be wrapped in Fragment or div.
    if (child.type === KanbanCard) {
      n += 1;
      return;
    }
    if (child.type === Fragment) {
      n += countCardChildren((child.props as { children?: React.ReactNode }).children);
    }
  });
  return n;
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
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => registerColumn(id), [id, registerColumn]);

  // Compute drop index from mouse Y by walking direct card children.
  const updateDropIndex = useCallback((clientY: number) => {
    const container = cardsRef.current;
    if (!container) {
      setDropIndex(null);
      return;
    }
    const cards = container.querySelectorAll<HTMLElement>(
      ":scope > [data-react-fancy-kanban-card]",
    );
    let idx = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i]!.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        idx = i;
        break;
      }
    }
    setDropIndex(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      // Only react to card drags. Column drags are handled by the root.
      if (!draggedCard) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
      updateDropIndex(e.clientY);
    },
    [draggedCard, updateDropIndex],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when leaving the column entirely, not when crossing
    // child boundaries.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
    setDropIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!draggedCard) return;
      e.preventDefault();
      e.stopPropagation();
      const target = dropIndex ?? 0;

      if (dragSource && draggedCard) {
        // For same-column reorder, account for the source card being
        // removed before re-insertion.
        let finalIdx = target;
        if (dragSource === id) {
          const srcIdx = findCardIndex(children, draggedCard);
          if (srcIdx !== -1 && target > srcIdx) {
            finalIdx = target - 1;
          }
          if (srcIdx === finalIdx) {
            // No-op move
            setDragOver(false);
            setDropIndex(null);
            return;
          }
        }
        onCardMove?.(draggedCard, dragSource, id, finalIdx);
      }

      setDragOver(false);
      setDropIndex(null);
    },
    [draggedCard, dragSource, dropIndex, id, onCardMove, children],
  );

  const cardCount = countCardChildren(children);
  if (hideWhenEmpty && cardCount === 0 && !draggedCard) {
    return null;
  }

  // Walk children, interleaving the drop indicator at the computed
  // index. We track the "card index seen so far" so the indicator lands
  // before the right card even when non-card children (handles, custom
  // headers) are interleaved.
  let cardSeen = 0;
  const showIndicator = draggedCard !== null && dropIndex !== null && dragOver;

  const renderedChildren = Children.toArray(children).map((child, i) => {
    const isCard = isValidElement(child) && child.type === KanbanCard;
    const indicator =
      showIndicator && isCard && cardSeen === dropIndex ? (
        <DropIndicator key={`drop-${i}`} />
      ) : null;
    if (isCard) cardSeen += 1;
    return (
      <Fragment key={i}>
        {indicator}
        {child}
      </Fragment>
    );
  });

  // Trailing indicator when dropping at the end.
  if (showIndicator && dropIndex === cardCount) {
    renderedChildren.push(<DropIndicator key="drop-end" />);
  }

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
        <div ref={cardsRef} className="flex flex-1 flex-col gap-2">
          {renderedChildren}
        </div>
      </div>
    </KanbanColumnContext.Provider>
  );
}

KanbanColumn.displayName = "KanbanColumn";

// ── Drop indicator ──────────────────────────────────────────────────────

function DropIndicator() {
  return (
    <div
      data-react-fancy-kanban-drop-indicator=""
      className="h-0.5 -my-1 rounded-full bg-blue-500/80"
    />
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function findCardIndex(
  children: React.ReactNode,
  cardId: string,
): number {
  let idx = -1;
  let i = 0;
  Children.forEach(children, (child) => {
    if (idx !== -1) return;
    if (!isValidElement(child)) return;
    if (child.type === KanbanCard) {
      if ((child.props as { id?: string }).id === cardId) {
        idx = i;
      }
      i += 1;
    }
  });
  return idx;
}
