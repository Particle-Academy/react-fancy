import { useMemo, useCallback, useState } from "react";
import { cn } from "../../utils/cn";
import { TreeNavContext } from "./TreeNav.context";
import { TreeNode } from "./TreeNode";
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

function TreeNavRoot({
  nodes,
  selectedId,
  onSelect,
  onNodeContextMenu,
  draggable = false,
  onNodeMove,
  expandedIds: controlledExpanded,
  defaultExpandedIds,
  onExpandedChange,
  defaultExpandAll = false,
  indentSize = 16,
  showIcons = true,
  className,
}: TreeNavProps) {
  const [internalExpanded, setInternalExpanded] = useState<string[]>(() => {
    if (defaultExpandedIds) return defaultExpandedIds;
    if (defaultExpandAll) return collectFolderIds(nodes);
    return [];
  });

  const isControlled = controlledExpanded !== undefined;
  const expandedIds = isControlled ? controlledExpanded : internalExpanded;

  const toggle = useCallback(
    (id: string) => {
      const next = expandedIds.includes(id)
        ? expandedIds.filter((v) => v !== id)
        : [...expandedIds, id];

      if (!isControlled) {
        setInternalExpanded(next);
      }
      onExpandedChange?.(next);
    },
    [expandedIds, isControlled, onExpandedChange],
  );

  const expandNode = useCallback(
    (id: string) => {
      if (expandedIds.includes(id)) return;
      const next = [...expandedIds, id];
      if (!isControlled) {
        setInternalExpanded(next);
      }
      onExpandedChange?.(next);
    },
    [expandedIds, isControlled, onExpandedChange],
  );

  const [dragState, setDragState] = useState<DragState>(EMPTY_DRAG_STATE);

  const handleDragEnd = useCallback(() => {
    setDragState(EMPTY_DRAG_STATE);
  }, []);

  const ctx = useMemo(
    () => ({
      selectedId, onSelect, onNodeContextMenu, expandedIds, toggle, indentSize, showIcons,
      draggable, dragState, setDragState, onNodeMove, nodes, expandNode,
    }),
    [selectedId, onSelect, onNodeContextMenu, expandedIds, toggle, indentSize, showIcons,
     draggable, dragState, onNodeMove, nodes, expandNode],
  );

  return (
    <TreeNavContext.Provider value={ctx}>
      <nav
        data-react-fancy-tree-nav=""
        className={cn("flex flex-col gap-0.5 py-1 text-sm", className)}
        onDragEnd={draggable ? handleDragEnd : undefined}
      >
        {nodes.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} />
        ))}
      </nav>
    </TreeNavContext.Provider>
  );
}

TreeNavRoot.displayName = "TreeNav";

export const TreeNav = Object.assign(TreeNavRoot, {
  Node: TreeNode,
});
