import { useMemo, useCallback, useState } from "react";
import { cn } from "../../utils/cn";
import { TreeNavContext } from "./TreeNav.context";
import { TreeNode } from "./TreeNode";
import type { TreeNavProps, TreeNodeData } from "./TreeNav.types";

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

function TreeNavRoot({
  nodes,
  selectedId,
  onSelect,
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

  const ctx = useMemo(
    () => ({ selectedId, onSelect, expandedIds, toggle, indentSize, showIcons }),
    [selectedId, onSelect, expandedIds, toggle, indentSize, showIcons],
  );

  return (
    <TreeNavContext.Provider value={ctx}>
      <nav
        data-react-fancy-tree-nav=""
        className={cn("flex flex-col gap-0.5 py-1 text-sm", className)}
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
