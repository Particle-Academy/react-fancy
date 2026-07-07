import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { FileBrowserContext } from "./FileBrowser.context";
import { FileBrowserPathBar } from "./FileBrowserPathBar";
import { FileBrowserToolbar } from "./FileBrowserToolbar";
import { FileBrowserTree } from "./FileBrowserTree";
import { FileBrowserNode } from "./FileBrowserNode";
import {
  compareFileEntries,
  entryMatchesFilter,
  isEntryExpandable,
  parentPath,
} from "./FileBrowser.utils";
import type {
  FileBrowserContextValue,
  FileBrowserProps,
  FileBrowserRow,
  FileEntry,
  FileLoadStatus,
  FileSnapshotNode,
  FileSort,
} from "./FileBrowser.types";

const DEFAULT_SORT: FileSort = { by: "name", direction: "asc" };

function snapshotNodeToEntry(node: FileSnapshotNode): FileEntry {
  const { children: _children, ...entry } = node;
  return entry;
}

/**
 * Index a snapshot tree into a `parent path -> children` map. Roots group
 * under their own parent path (usually `"/"`); any node with a materialized
 * `children` array defines that folder's listing. Dirs with `children`
 * undefined stay unknown — a provider fills them lazily in hybrid mode.
 */
function buildSnapshotMap(snapshot: FileSnapshotNode[] | undefined): Map<string, FileEntry[]> {
  const map = new Map<string, FileEntry[]>();
  if (!snapshot || snapshot.length === 0) return map;

  for (const root of snapshot) {
    const parent = parentPath(root.path);
    const list = map.get(parent);
    if (list) list.push(snapshotNodeToEntry(root));
    else map.set(parent, [snapshotNodeToEntry(root)]);
  }

  const walk = (nodes: FileSnapshotNode[]) => {
    for (const node of nodes) {
      if (node.children) {
        map.set(node.path, node.children.map(snapshotNodeToEntry));
        walk(node.children);
      }
    }
  };
  walk(snapshot);

  return map;
}

/**
 * FileBrowser — remote-capable file/folder browser + directory picker.
 *
 * Browses any file tree the host can describe — local FS, HTTP, SSH, or a
 * remote machine streaming snapshots — via two feeding modes that may be
 * combined:
 *
 * - **Provider mode (lazy pull):** pass `provider.loadChildren(path)`. Folders
 *   load on first expand with per-node loading + error states; the tree is
 *   never walked eagerly.
 * - **Snapshot mode (streamed push):** pass a JSON-friendly `snapshot` tree
 *   and replace/patch it as chunks arrive (relay / WebSocket / MCP). The
 *   snapshot is the source of truth for every path it covers; with a provider
 *   also present, unknown-depth folders stay lazily loadable (hybrid).
 *
 * Fully controlled per the Human+ component contract (`value`/`onChange`,
 * `path`/`onPathChange`, `expandedPaths`/`onExpandedChange`, plus
 * `sort`/`filter`), with uncontrolled `defaultX` fallbacks. Every row carries
 * a `data-path` attribute — paths are the stable handles agents target, never
 * indexes or generated ids.
 *
 * Agent bridge sketch (ships later in `@particle-academy/agent-integrations`):
 * `registerFilesBridge(server, { adapter })` will expose MCP tools over this
 * surface — `files_list(path)`, `files_expand(path)` / `files_collapse(path)`,
 * `files_select(paths)`, `files_navigate(path)`, and
 * `files_request_snapshot(path, depth)` — with each mutation emitting an
 * `AgentActivity` event so presence, undo, and coaching layers compose. The
 * adapter maps those tools onto the same controlled props
 * (`value`/`path`/`expandedPaths`) and provider/snapshot contract; no DOM
 * scraping required.
 *
 * Read-only in v1: no content preview (pair with fancy-code's `FileViewer`)
 * and no write operations — rename/delete/upload arrive later behind a
 * `pendingMode`-gated iteration.
 */
function FileBrowserRoot({
  provider,
  snapshot,
  select = "file",
  multiple = false,
  value,
  defaultValue,
  onChange,
  path,
  defaultPath = "/",
  onPathChange,
  expandedPaths,
  defaultExpandedPaths,
  onExpandedChange,
  sort,
  defaultSort,
  onSortChange,
  filter,
  defaultFilter,
  onFilterChange,
  onError,
  indentSize = 16,
  showIcons = true,
  className,
  children,
}: FileBrowserProps) {
  // ---------------------------------------------------------------------------
  // Controlled / uncontrolled state
  // ---------------------------------------------------------------------------

  const [currentPath, setCurrentPath] = useControllableState(path, defaultPath, onPathChange);
  const [expanded, setExpanded] = useControllableState(
    expandedPaths,
    defaultExpandedPaths ?? [],
    onExpandedChange,
  );
  const [sortState, setSortState] = useControllableState(sort, defaultSort ?? DEFAULT_SORT, onSortChange);
  const [filterState, setFilterState] = useControllableState(filter, defaultFilter ?? "", onFilterChange);

  // Selection is managed directly (not via useControllableState) because
  // onChange also receives the matching FileEntry objects.
  const [internalValue, setInternalValue] = useState<string | string[] | null>(
    () => defaultValue ?? (multiple ? [] : null),
  );
  const selection = value !== undefined ? value : internalValue;
  const selectedPaths = useMemo(
    () => (selection == null ? [] : Array.isArray(selection) ? selection : [selection]),
    [selection],
  );

  // ---------------------------------------------------------------------------
  // Data layer — snapshot map + lazy provider cache
  // ---------------------------------------------------------------------------

  const snapshotMap = useMemo(() => buildSnapshotMap(snapshot), [snapshot]);

  const [loadedChildren, setLoadedChildren] = useState<Record<string, FileEntry[]>>({});
  const [loadStatus, setLoadStatus] = useState<Record<string, FileLoadStatus>>({});
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});

  const seqCounter = useRef(0);
  const requestSeq = useRef<Record<string, number>>({});

  // Latest-state refs so `loadPath` stays referentially stable.
  const stateRef = useRef({ snapshotMap, loadedChildren, loadStatus });
  stateRef.current = { snapshotMap, loadedChildren, loadStatus };
  const providerRef = useRef(provider);
  providerRef.current = provider;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const loadPath = useCallback((targetPath: string, options?: { reload?: boolean }) => {
    const prov = providerRef.current;
    if (!prov) return;
    const { snapshotMap: snap, loadedChildren: loaded, loadStatus: statuses } = stateRef.current;
    const status = statuses[targetPath] ?? "idle";
    if (status === "loading") return;
    const known = snap.get(targetPath) ?? loaded[targetPath];
    if (!options?.reload && (known !== undefined || status === "error")) return;

    const requestId = ++seqCounter.current;
    requestSeq.current[targetPath] = requestId;
    setLoadStatus((prev) => ({ ...prev, [targetPath]: "loading" }));

    prov.loadChildren(targetPath).then(
      (entries) => {
        if (requestSeq.current[targetPath] !== requestId) return;
        setLoadedChildren((prev) => ({ ...prev, [targetPath]: entries }));
        setLoadStatus((prev) => ({ ...prev, [targetPath]: "loaded" }));
        setLoadErrors((prev) => {
          if (!(targetPath in prev)) return prev;
          const next = { ...prev };
          delete next[targetPath];
          return next;
        });
      },
      (error: unknown) => {
        if (requestSeq.current[targetPath] !== requestId) return;
        setLoadStatus((prev) => ({ ...prev, [targetPath]: "error" }));
        setLoadErrors((prev) => ({
          ...prev,
          [targetPath]: error instanceof Error ? error.message : String(error),
        }));
        onErrorRef.current?.(targetPath, error);
      },
    );
  }, []);

  const entriesFor = useCallback(
    (p: string) => snapshotMap.get(p) ?? loadedChildren[p],
    [snapshotMap, loadedChildren],
  );

  const statusFor = useCallback(
    (p: string): FileLoadStatus => {
      if (snapshotMap.has(p)) return "loaded";
      const status = loadStatus[p];
      if (status) return status;
      return loadedChildren[p] !== undefined ? "loaded" : "idle";
    },
    [snapshotMap, loadStatus, loadedChildren],
  );

  const errorFor = useCallback((p: string) => loadErrors[p], [loadErrors]);

  // Lazy loading — only the current directory and explicitly expanded folders
  // (including expansions driven from outside via the controlled
  // `expandedPaths` prop). Never an eager walk; errored paths wait for an
  // explicit retry.
  useEffect(() => {
    if (!provider) return;
    loadPath(currentPath);
    for (const p of expanded) loadPath(p);
  }, [provider, currentPath, expanded, snapshotMap, loadPath]);

  // ---------------------------------------------------------------------------
  // Filter + sort + flattened visible rows
  // ---------------------------------------------------------------------------

  const filterLower = filterState.trim().toLowerCase();

  const visibleChildrenFor = useCallback(
    (p: string): FileEntry[] => {
      const entries = entriesFor(p);
      if (!entries) return [];
      const filtered = filterLower
        ? entries.filter((entry) => entryMatchesFilter(entry, filterLower, entriesFor))
        : entries.slice();
      return filtered.sort((a, b) => compareFileEntries(a, b, sortState));
    },
    [entriesFor, filterLower, sortState],
  );

  const visibleRows = useMemo(() => {
    const rows: FileBrowserRow[] = [];
    const visited = new Set<string>([currentPath]);
    const walk = (p: string, depth: number, parent: string | null) => {
      for (const entry of visibleChildrenFor(p)) {
        const expandable = isEntryExpandable(entry, entriesFor(entry.path), !!provider);
        const isOpen = expandable && expanded.includes(entry.path);
        rows.push({ entry, depth, expandable, expanded: isOpen, parentPath: parent });
        if (isOpen && !visited.has(entry.path)) {
          visited.add(entry.path);
          walk(entry.path, depth + 1, entry.path);
        }
      }
    };
    walk(currentPath, 0, null);
    return rows;
  }, [visibleChildrenFor, entriesFor, provider, expanded, currentPath]);

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  const entryIndex = useMemo(() => {
    const map = new Map<string, FileEntry>();
    for (const list of snapshotMap.values()) {
      for (const entry of list) map.set(entry.path, entry);
    }
    for (const list of Object.values(loadedChildren)) {
      for (const entry of list) {
        if (!map.has(entry.path)) map.set(entry.path, entry);
      }
    }
    return map;
  }, [snapshotMap, loadedChildren]);

  const isSelectable = useCallback(
    (entry: FileEntry) =>
      !entry.disabled &&
      (select === "both" || (select === "file" ? entry.kind === "file" : entry.kind === "dir")),
    [select],
  );

  const isSelected = useCallback((p: string) => selectedPaths.includes(p), [selectedPaths]);

  const commitSelection = useCallback(
    (paths: string[]) => {
      const nextValue = multiple ? paths : (paths[0] ?? null);
      if (value === undefined) setInternalValue(nextValue);
      onChangeRef.current?.(
        nextValue,
        paths
          .map((p) => entryIndex.get(p))
          .filter((entry): entry is FileEntry => entry !== undefined),
      );
    },
    [multiple, value, entryIndex],
  );

  const selectEntry = useCallback(
    (entry: FileEntry) => {
      if (!isSelectable(entry)) return;
      if (multiple) {
        commitSelection(
          selectedPaths.includes(entry.path)
            ? selectedPaths.filter((p) => p !== entry.path)
            : [...selectedPaths, entry.path],
        );
      } else {
        commitSelection([entry.path]);
      }
    },
    [isSelectable, multiple, selectedPaths, commitSelection],
  );

  // ---------------------------------------------------------------------------
  // Expansion, navigation, roving focus
  // ---------------------------------------------------------------------------

  const toggleExpanded = useCallback(
    (p: string) => {
      setExpanded((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
    },
    [setExpanded],
  );

  const [focusedPath, setFocusedPath] = useState<string | null>(null);

  const navigate = useCallback(
    (p: string) => {
      setCurrentPath(p);
      setFilterState("");
      setFocusedPath(null);
    },
    [setCurrentPath, setFilterState],
  );

  const rowRefs = useRef(new Map<string, HTMLElement>());

  const registerRow = useCallback((p: string, el: HTMLElement | null) => {
    if (el) rowRefs.current.set(p, el);
    else rowRefs.current.delete(p);
  }, []);

  const focusRow = useCallback((p: string) => {
    rowRefs.current.get(p)?.focus();
  }, []);

  const tabFocusPath = useMemo(() => {
    if (focusedPath && visibleRows.some((row) => row.entry.path === focusedPath)) {
      return focusedPath;
    }
    return visibleRows[0]?.entry.path ?? null;
  }, [focusedPath, visibleRows]);

  // ---------------------------------------------------------------------------
  // Context + render
  // ---------------------------------------------------------------------------

  const ctx = useMemo<FileBrowserContextValue>(
    () => ({
      entriesFor,
      visibleChildrenFor,
      statusFor,
      errorFor,
      loadPath,
      hasProvider: !!provider,
      path: currentPath,
      navigate,
      expandedPaths: expanded,
      toggleExpanded,
      select,
      multiple,
      selectedPaths,
      isSelected,
      isSelectable,
      selectEntry,
      sort: sortState,
      setSort: setSortState,
      filter: filterState,
      setFilter: setFilterState,
      visibleRows,
      focusedPath,
      setFocusedPath,
      tabFocusPath,
      focusRow,
      registerRow,
      indentSize,
      showIcons,
    }),
    [
      entriesFor, visibleChildrenFor, statusFor, errorFor, loadPath, provider,
      currentPath, navigate, expanded, toggleExpanded, select, multiple,
      selectedPaths, isSelected, isSelectable, selectEntry, sortState,
      setSortState, filterState, setFilterState, visibleRows, focusedPath,
      tabFocusPath, focusRow, registerRow, indentSize, showIcons,
    ],
  );

  return (
    <FileBrowserContext.Provider value={ctx}>
      <div
        data-react-fancy-file-browser=""
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-900",
          className,
        )}
      >
        {children ?? (
          <>
            <FileBrowserPathBar />
            <FileBrowserToolbar />
            <FileBrowserTree />
          </>
        )}
      </div>
    </FileBrowserContext.Provider>
  );
}

FileBrowserRoot.displayName = "FileBrowser";

export const FileBrowser = Object.assign(FileBrowserRoot, {
  PathBar: FileBrowserPathBar,
  Toolbar: FileBrowserToolbar,
  Tree: FileBrowserTree,
  Node: FileBrowserNode,
});
