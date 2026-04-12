import type { ReactNode } from "react";

export interface TreeNodeData {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Node type for icon rendering */
  type?: "file" | "folder";
  /** File extension hint (e.g., "ts", "php", "html") for icon coloring */
  ext?: string;
  /** Nested children */
  children?: TreeNodeData[];
  /** Custom icon override */
  icon?: ReactNode;
  /** Whether the node is disabled */
  disabled?: boolean;
}

/** Where the dragged node will land relative to the drop target */
export type DropPosition = "before" | "after" | "inside";

export interface DragState {
  draggedNodeId: string | null;
  dropTargetId: string | null;
  dropPosition: DropPosition | null;
}

export interface TreeNavProps {
  /** Tree data */
  nodes: TreeNodeData[];
  /** Currently selected node ID */
  selectedId?: string;
  /** Callback when a node is selected */
  onSelect?: (id: string, node: TreeNodeData) => void;
  /** Callback when a node is right-clicked */
  onNodeContextMenu?: (e: React.MouseEvent, node: TreeNodeData) => void;
  /** Enable drag-and-drop reordering (default: false) */
  draggable?: boolean;
  /** Callback when a node is moved via drag and drop */
  onNodeMove?: (sourceId: string, targetId: string, position: DropPosition) => void;
  /** Controlled expanded node IDs */
  expandedIds?: string[];
  /** Default expanded node IDs (uncontrolled) */
  defaultExpandedIds?: string[];
  /** Callback when expanded state changes */
  onExpandedChange?: (ids: string[]) => void;
  /** Expand all folders by default */
  defaultExpandAll?: boolean;
  /** Indent size per nesting level in px (default: 16) */
  indentSize?: number;
  /** Show file/folder icons (default: true) */
  showIcons?: boolean;
  /** Custom className */
  className?: string;
}

export interface TreeNavContextValue {
  selectedId?: string;
  onSelect?: (id: string, node: TreeNodeData) => void;
  onNodeContextMenu?: (e: React.MouseEvent, node: TreeNodeData) => void;
  expandedIds: string[];
  toggle: (id: string) => void;
  indentSize: number;
  showIcons: boolean;
  draggable: boolean;
  dragState: DragState;
  setDragState: (state: DragState) => void;
  onNodeMove?: (sourceId: string, targetId: string, position: DropPosition) => void;
  nodes: TreeNodeData[];
  expandNode: (id: string) => void;
}

export interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  className?: string;
}
