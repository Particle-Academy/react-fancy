import { useMemo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { VirtualList } from "../VirtualList";
import { TreeNavContext } from "./TreeNav.context";
import { TreeNode } from "./TreeNode";
import { createTreeStore, TreeInternalsContext, type TreeInternals } from "./tree-store";
import type { TreeNavProps, TreeNodeData, DragState } from "./TreeNav.types";

function collectFolderIds(nodes: TreeNodeData[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      ids.push(node.id);
      ids.push(...collectFolderIds(node.children));
    }
  }
  return ids;
}

const EMPTY_DRAG_STATE: DragState = {
  draggedNodeId: null,
  dropTargetId: null,
  dropPosition: null,
};

interface FlatRow {
  id: string;
  node: TreeNodeData;
  depth: number;
}

/** The rows currently visible — every node, descending only into expanded folders. */
function flattenVisible(nodes: TreeNodeData[], expanded: ReadonlySet<string>): FlatRow[] {
  const rows: FlatRow[] = [];
  const walk = (list: TreeNodeData[], depth: number) => {
    for (const node of list) {
      rows.push({ id: node.id, node, depth });
      const isFolder = node.type === "folder" || (node.children && node.children.length > 0);
      if (isFolder && node.children && expanded.has(node.id)) walk(node.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return rows;
}

function TreeNavRoot({
  nodes,
  selectedId,
  onSelect,
  onNodeContextMenu,
  draggable = false,
  onNodeMove,
  acceptExternalDrops = false,
  onExternalDrop,
  expandedIds: controlledExpanded,
  defaultExpandedIds,
  onExpandedChange,
  defaultExpandAll = false,
  indentSize = 16,
  showIcons = true,
  dragCursor = "none",
  virtualize = false,
  height = 400,
  rowHeight = 26,
  className,
}: TreeNavProps) {
  const [internalExpanded, setInternalExpanded] = useState<string[]>(() => {
    if (defaultExpandedIds) return defaultExpandedIds;
    if (defaultExpandAll) return collectFolderIds(nodes);
    return [];
  });

  const isControlled = controlledExpanded !== undefined;
  const expandedIds = isControlled ? controlledExpanded : internalExpanded;
  // One Set per change, so a row's "am I expanded?" is a lookup, not a scan.
  const expanded = useMemo(() => new Set(expandedIds), [expandedIds]);

  const [dragState, setDragState] = useState<DragState>(EMPTY_DRAG_STATE);

  /*
   * The latest props and state, for handlers that must stay STABLE. A handler
   * whose identity changes on every click would change the context rows read,
   * and re-render every row — the exact cost this component is avoiding.
   */
  const latest = useRef({ expandedIds, isControlled, onExpandedChange, onSelect, onNodeContextMenu, onNodeMove, onExternalDrop });
  latest.current = { expandedIds, isControlled, onExpandedChange, onSelect, onNodeContextMenu, onNodeMove, onExternalDrop };

  const setExpanded = useCallback((next: string[]) => {
    if (!latest.current.isControlled) setInternalExpanded(next);
    latest.current.onExpandedChange?.(next);
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const current = latest.current.expandedIds;
      setExpanded(current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);
    },
    [setExpanded],
  );

  const expandNode = useCallback(
    (id: string) => {
      const current = latest.current.expandedIds;
      if (!current.includes(id)) setExpanded([...current, id]);
    },
    [setExpanded],
  );

  const select = useCallback((node: TreeNodeData) => latest.current.onSelect?.(node.id, node), []);
  const contextMenu = useCallback(
    (e: React.MouseEvent, node: TreeNodeData) => latest.current.onNodeContextMenu?.(e, node),
    [],
  );
  const moveNode = useCallback(
    (sourceId: string, targetId: string, position: Parameters<NonNullable<TreeNavProps["onNodeMove"]>>[2]) =>
      latest.current.onNodeMove?.(sourceId, targetId, position),
    [],
  );
  const externalDrop = useCallback(
    (event: React.DragEvent, target: TreeNodeData, position: Parameters<NonNullable<TreeNavProps["onExternalDrop"]>>[2]) =>
      latest.current.onExternalDrop?.(event, target, position),
    [],
  );

  // What rows subscribe to. Seeded with this render's values so the first paint
  // is right; kept current after each render that changes them.
  const [store] = useState(() => createTreeStore({ selectedId, expanded, dragState }));
  useLayoutEffect(() => {
    const current = store.get();
    if (current.selectedId !== selectedId || current.expanded !== expanded || current.dragState !== dragState) {
      store.set({ selectedId, expanded, dragState });
    }
  }, [store, selectedId, expanded, dragState]);

  const hasContextMenu = onNodeContextMenu !== undefined;
  const internals = useMemo<TreeInternals>(
    () => ({
      store,
      nodes,
      select,
      toggle,
      expandNode,
      setDragState,
      // Present only when the host gave one: a row then claims the right-click.
      contextMenu: hasContextMenu ? contextMenu : undefined,
      moveNode,
      externalDrop,
      indentSize,
      showIcons,
      draggable,
      dragCursor,
      acceptExternalDrops,
      flat: virtualize,
    }),
    [store, nodes, select, toggle, expandNode, hasContextMenu, contextMenu, moveNode, externalDrop,
     indentSize, showIcons, draggable, dragCursor, acceptExternalDrops, virtualize],
  );

  // Unchanged public context, still live for `useTreeNav()` callers. Rows no
  // longer read it, so its changing on a click re-renders only those callers.
  const ctx = useMemo(
    () => ({
      selectedId, onSelect, onNodeContextMenu, expandedIds, toggle, indentSize, showIcons,
      draggable, dragCursor, dragState, setDragState, onNodeMove, acceptExternalDrops, onExternalDrop, nodes, expandNode,
    }),
    [selectedId, onSelect, onNodeContextMenu, expandedIds, toggle, indentSize, showIcons,
     draggable, dragCursor, dragState, onNodeMove, acceptExternalDrops, onExternalDrop, nodes, expandNode],
  );

  const rows = useMemo(
    () => (virtualize ? flattenVisible(nodes, expanded) : []),
    [virtualize, nodes, expanded],
  );

  const handleDragEnd = useCallback(() => {
    setDragState(EMPTY_DRAG_STATE);
  }, []);

  const dropEnabled = draggable || acceptExternalDrops;

  return (
    <TreeNavContext.Provider value={ctx}>
      <TreeInternalsContext.Provider value={internals}>
        <nav
          data-react-fancy-tree-nav=""
          data-react-fancy-tree-nav-virtual={virtualize ? "" : undefined}
          className={cn("flex flex-col gap-0.5 py-1 text-sm", className)}
          onDragEnd={dropEnabled ? handleDragEnd : undefined}
        >
          {virtualize ? (
            <VirtualList
              items={rows}
              height={height}
              estimateRowHeight={rowHeight}
              renderRow={(row) => <TreeNode node={row.node} depth={row.depth} />}
            />
          ) : (
            nodes.map((node) => <TreeNode key={node.id} node={node} depth={0} />)
          )}
        </nav>
      </TreeInternalsContext.Provider>
    </TreeNavContext.Provider>
  );
}

TreeNavRoot.displayName = "TreeNav";

export const TreeNav = Object.assign(TreeNavRoot, {
  Node: TreeNode,
});
