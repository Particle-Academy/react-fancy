import { useRef, useEffect, useCallback } from "react";
import { cn } from "../../utils/cn";
import { useTreeNav } from "./TreeNav.context";
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

export function TreeNode({ node, depth }: TreeNodeProps) {
  const {
    selectedId, onSelect, onNodeContextMenu, expandedIds, toggle, indentSize, showIcons,
    draggable, dragState, setDragState, onNodeMove, nodes, expandNode,
  } = useTreeNav();

  const isFolder = node.type === "folder" || (node.children && node.children.length > 0);
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedId === node.id;
  const paddingLeft = depth * indentSize + 4;

  const isDragging = dragState.draggedNodeId === node.id;
  const isDropTarget = dragState.dropTargetId === node.id;
  const dropPosition = isDropTarget ? dragState.dropPosition : null;

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
    onSelect?.(node.id, node);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onNodeContextMenu) {
      e.preventDefault();
      onNodeContextMenu(e, node);
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
  // Drop target handlers (on outer div)
  // ---------------------------------------------------------------------------

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!dragState.draggedNodeId) return;
    const sourceId = dragState.draggedNodeId;
    if (sourceId === node.id) return;
    if (isDescendantOf(nodes, sourceId, node.id)) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const position = computeDropPosition(e, !!isFolder);

    // Auto-expand collapsed folders when hovering "inside"
    if (isFolder && !isExpanded && position === "inside") {
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
      setDragState({ draggedNodeId: sourceId, dropTargetId: node.id, dropPosition: position });
    }
  }, [dragState, node.id, isFolder, isExpanded, nodes, setDragState, expandNode, clearAutoExpand]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      clearAutoExpand();
      if (dragState.dropTargetId === node.id) {
        setDragState({ ...dragState, dropTargetId: null, dropPosition: null });
      }
    }
  }, [dragState, node.id, setDragState, clearAutoExpand]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearAutoExpand();

    const sourceId = dragState.draggedNodeId;
    const position = dragState.dropPosition;
    if (!sourceId || !position) return;
    if (sourceId === node.id) return;
    if (isDescendantOf(nodes, sourceId, node.id)) return;

    onNodeMove?.(sourceId, node.id, position);
    setDragState({ draggedNodeId: null, dropTargetId: null, dropPosition: null });
  }, [dragState, node.id, nodes, onNodeMove, setDragState, clearAutoExpand]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const canDrag = draggable && !node.disabled;

  return (
    <div
      data-react-fancy-tree-node=""
      onDragOver={draggable ? handleDragOver : undefined}
      onDragLeave={draggable ? handleDragLeave : undefined}
      onDrop={draggable ? handleDrop : undefined}
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
          canDrag && "cursor-grab active:cursor-grabbing",
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

      {isFolder && isExpanded && node.children && (
        <div data-react-fancy-tree-node-children="">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

TreeNode.displayName = "TreeNode";
