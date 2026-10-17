import { memo, useRef, useEffect, useCallback } from "react";
import { cn } from "../../utils/cn";
import { useTreeInternals, useTreeSlice } from "./tree-store";
import type { TreeNodeProps, TreeNodeData, DropPosition } from "./TreeNav.types";

const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  js: "#f7df1e",
  jsx: "#f7df1e",
  php: "#777bb4",
  html: "#e34c26",
  htm: "#e34c26",
  css: "#264de4",
  json: "#a1a1aa",
  md: "#71717a",
  yaml: "#cb171e",
  yml: "#cb171e",
};

function FileIcon({ ext }: { ext?: string }) {
  const color = (ext && EXT_COLORS[ext.toLowerCase()]) || "#71717a";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M4 1h5.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke={color} strokeWidth="1.2" />
      <path d="M9 1v4h4" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M1.5 3.5a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1V5H2.5V3.5z" fill="#fbbf24" />
        <path d="M1 6h13l-1.5 7.5H2.5L1 6z" fill="#fbbf24" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M1.5 3a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1v8a1 1 0 01-1 1H2.5a1 1 0 01-1-1V3z" fill="#fbbf24" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0 transition-transform duration-150", open && "rotate-90")}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function isDescendantOf(
  nodes: TreeNodeData[],
  ancestorId: string,
  targetId: string,
): boolean {
  function findNode(haystack: TreeNodeData[], id: string): TreeNodeData | undefined {
    for (const n of haystack) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNode(n.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  function hasDescendant(node: TreeNodeData, id: string): boolean {
    if (!node.children) return false;
    for (const child of node.children) {
      if (child.id === id) return true;
      if (hasDescendant(child, id)) return true;
    }
    return false;
  }

  const ancestor = findNode(nodes, ancestorId);
  return ancestor ? hasDescendant(ancestor, targetId) : false;
}

function computeDropPosition(
  e: React.DragEvent,
  isFolder: boolean,
): DropPosition {
  const rect = e.currentTarget.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;
  const third = rect.height / 3;

  if (offsetY < third) return "before";
  if (offsetY > third * 2) return "after";
  return isFolder ? "inside" : "after";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------


/**
 * One row (and, when nested, its expanded children).
 *
 * Reads what changes on a click — selection, expansion, drag — as per-row slices
 * of a store, so a click re-renders only the rows whose slice changed. It used to
 * read one context holding all of it, so every click re-rendered every row:
 * 175-267 ms per click on a 5,000-node tree. `memo` keeps a parent's re-render
 * from reaching rows whose `node` and `depth` did not change.
 */
function TreeNodeImpl({ node, depth }: TreeNodeProps) {
  const {
    store, nodes, select, toggle, expandNode, setDragState, contextMenu, moveNode, externalDrop,
    indentSize, showIcons, draggable, dragCursor, acceptExternalDrops, flat,
  } = useTreeInternals();

  const isFolder = node.type === "folder" || (node.children && node.children.length > 0);
  const isExpanded = useTreeSlice((s) => s.expanded.has(node.id));
  const isSelected = useTreeSlice((s) => s.selectedId === node.id);
  const isDragging = useTreeSlice((s) => s.dragState.draggedNodeId === node.id);
  const dropPosition = useTreeSlice((s) =>
    s.dragState.dropTargetId === node.id ? s.dragState.dropPosition : null,
  );
  const isDropTarget = dropPosition !== null;
  const paddingLeft = depth * indentSize + 4;

  // Auto-expand timer for folders during drag
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoExpand = useCallback(() => {
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }
  }, []);

  useEffect(() => clearAutoExpand, [clearAutoExpand]);

  // ---------------------------------------------------------------------------
  // Click handlers
  // ---------------------------------------------------------------------------

  const handleClick = () => {
    if (node.disabled) return;
    if (isFolder) {
      toggle(node.id);
    }
    select(node);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (contextMenu) {
      e.preventDefault();
      contextMenu(e, node);
    }
  };

  // ---------------------------------------------------------------------------
  // Drag source handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", node.id);
    e.dataTransfer.effectAllowed = "move";
    // Set state async so the browser captures the element for the drag ghost first
    requestAnimationFrame(() => {
      setDragState({ draggedNodeId: node.id, dropTargetId: null, dropPosition: null });
    });
  }, [node.id, setDragState]);

  const handleDragEnd = useCallback(() => {
    clearAutoExpand();
    setDragState({ draggedNodeId: null, dropTargetId: null, dropPosition: null });
  }, [clearAutoExpand, setDragState]);

  // ---------------------------------------------------------------------------
  // Drop target handlers (on outer div). Drag state is read from the store when
  // the event fires, so a row does not re-render as a drag moves elsewhere.
  // ---------------------------------------------------------------------------

  const handleDragOver = useCallback((e: React.DragEvent) => {
    const { dragState } = store.get();
    const isExternalDrag = !dragState.draggedNodeId;
    if (isExternalDrag) {
      // External drop accepted only when host opted in.
      if (!acceptExternalDrops) return;
    } else {
      const sourceId = dragState.draggedNodeId!;
      if (sourceId === node.id) return;
      if (isDescendantOf(nodes, sourceId, node.id)) return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = isExternalDrag ? "copy" : "move";

    const position = computeDropPosition(e, !!isFolder);

    // Auto-expand collapsed folders when hovering "inside"
    if (isFolder && !store.get().expanded.has(node.id) && position === "inside") {
      if (!autoExpandTimer.current) {
        autoExpandTimer.current = setTimeout(() => {
          expandNode(node.id);
          autoExpandTimer.current = null;
        }, 500);
      }
    } else {
      clearAutoExpand();
    }

    if (dragState.dropTargetId !== node.id || dragState.dropPosition !== position) {
      setDragState({ draggedNodeId: dragState.draggedNodeId, dropTargetId: node.id, dropPosition: position });
    }
  }, [store, acceptExternalDrops, node.id, isFolder, nodes, setDragState, expandNode, clearAutoExpand]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      clearAutoExpand();
      const { dragState } = store.get();
      if (dragState.dropTargetId === node.id) {
        setDragState({ ...dragState, dropTargetId: null, dropPosition: null });
      }
    }
  }, [store, node.id, setDragState, clearAutoExpand]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearAutoExpand();

    const { dragState } = store.get();
    const sourceId = dragState.draggedNodeId;
    const position = dragState.dropPosition ?? computeDropPosition(e, !!isFolder);

    if (sourceId) {
      // Internal node move.
      if (sourceId === node.id) return;
      if (isDescendantOf(nodes, sourceId, node.id)) return;
      moveNode?.(sourceId, node.id, position);
    } else if (acceptExternalDrops) {
      // External drop — files, items from other components, etc.
      externalDrop?.(e, node, position);
    }

    setDragState({ draggedNodeId: null, dropTargetId: null, dropPosition: null });
  }, [store, node, isFolder, nodes, moveNode, acceptExternalDrops, externalDrop, setDragState, clearAutoExpand]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const canDrag = draggable && !node.disabled;
  const dropEnabled = draggable || acceptExternalDrops;

  return (
    <div
      data-react-fancy-tree-node=""
      onDragOver={dropEnabled ? handleDragOver : undefined}
      onDragLeave={dropEnabled ? handleDragLeave : undefined}
      onDrop={dropEnabled ? handleDrop : undefined}
    >
      {/* Before drop indicator */}
      {isDropTarget && dropPosition === "before" && (
        <div
          data-react-fancy-tree-drop-indicator="before"
          className="pointer-events-none h-0.5 rounded-full bg-blue-500"
          style={{ marginLeft: paddingLeft }}
        />
      )}

      <button
        type="button"
        draggable={canDrag}
        onDragStart={canDrag ? handleDragStart : undefined}
        onDragEnd={canDrag ? handleDragEnd : undefined}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={node.disabled}
        className={cn(
          "flex w-full items-center gap-1 rounded-md py-0.5 text-left text-[13px] transition-colors",
          isSelected
            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
          node.disabled && "pointer-events-none opacity-40",
          isDragging && "opacity-50",
          // Grab affordance. By default (`dragCursor="none"`) the row keeps its
          // normal click cursor on hover — no open-hand "move me" cursor before
          // any drag — and only shows the closed-hand `grabbing` cursor while a
          // drag is actually underway (mousedown/drag). `dragCursor="grab"` opts
          // back into the always-on grab cursor for whole-row drag handles (#14).
          canDrag &&
            (dragCursor === "grab" ? "cursor-grab active:cursor-grabbing" : "active:cursor-grabbing"),
          isDropTarget && dropPosition === "inside" && "bg-blue-500/10 ring-1 ring-blue-500/30 ring-inset",
        )}
        style={{ paddingLeft }}
      >
        {isFolder && <ChevronIcon open={isExpanded} />}
        {!isFolder && <span className="w-3.5 shrink-0" />}
        {showIcons && (
          node.icon ?? (isFolder
            ? <FolderIcon open={isExpanded} />
            : <FileIcon ext={node.ext ?? node.label.split(".").pop()} />)
        )}
        <span className="truncate">{node.label}</span>
      </button>

      {/* After drop indicator */}
      {isDropTarget && dropPosition === "after" && (
        <div
          data-react-fancy-tree-drop-indicator="after"
          className="pointer-events-none h-0.5 rounded-full bg-blue-500"
          style={{ marginLeft: paddingLeft }}
        />
      )}

      {/* A virtual list renders rows flat, so a row never renders its own children there. */}
      {!flat && isFolder && isExpanded && node.children && (
        <div data-react-fancy-tree-node-children="">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export const TreeNode = memo(TreeNodeImpl);

TreeNode.displayName = "TreeNode";
