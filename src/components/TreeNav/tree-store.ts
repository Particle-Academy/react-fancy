import { createContext, useContext, useSyncExternalStore } from "react";
import type { DragState, DropPosition, TreeNodeData } from "./TreeNav.types";

/** What changes as someone clicks, toggles and drags — the state rows subscribe to. */
export interface TreeState {
  selectedId?: string;
  expanded: ReadonlySet<string>;
  dragState: DragState;
}

export interface TreeStore {
  get(): TreeState;
  set(next: TreeState): void;
  subscribe(listener: () => void): () => void;
}

export function createTreeStore(initial: TreeState): TreeStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Everything a row needs that does NOT change on a click. Handlers are stable
 * (they read the latest props and state when called), so this value only changes
 * when the tree's data or configuration does.
 *
 * Kept apart from the public `TreeNavContext` on purpose: that one still carries
 * live `selectedId` / `expandedIds` for `useTreeNav()` callers, and any component
 * reading it re-renders on every click. Rows no longer read it — which is the
 * whole fix: a click used to re-render every row in the tree.
 */
export interface TreeInternals {
  store: TreeStore;
  nodes: TreeNodeData[];
  select: (node: TreeNodeData) => void;
  toggle: (id: string) => void;
  expandNode: (id: string) => void;
  setDragState: (state: DragState) => void;
  contextMenu?: (e: React.MouseEvent, node: TreeNodeData) => void;
  moveNode?: (sourceId: string, targetId: string, position: DropPosition) => void;
  externalDrop?: (event: React.DragEvent, target: TreeNodeData, position: DropPosition) => void;
  indentSize: number;
  showIcons: boolean;
  draggable: boolean;
  dragCursor: "grab" | "none";
  acceptExternalDrops: boolean;
  /** Rows are rendered flat by a virtual list, so a row never renders its children. */
  flat: boolean;
}

export const TreeInternalsContext = createContext<TreeInternals | null>(null);

export function useTreeInternals(): TreeInternals {
  const internals = useContext(TreeInternalsContext);
  if (!internals) throw new Error("TreeNav.Node must be used within a <TreeNav> component");
  return internals;
}

/** Subscribe to ONE derived value; the row re-renders only when that value changes. */
export function useTreeSlice<T>(select: (state: TreeState) => T): T {
  const { store } = useTreeInternals();
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}
