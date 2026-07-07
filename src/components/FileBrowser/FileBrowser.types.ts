import type { ReactNode } from "react";

/** Entry kind — regular file or directory. */
export type FileKind = "file" | "dir";

/**
 * A single file-system entry. JSON-friendly by design so agents and remote
 * hosts can emit entries directly (over MCP, a relay, or a WebSocket).
 * `path` is the stable identity — POSIX-style, never an index.
 */
export interface FileEntry {
  /** Stable identity — POSIX-style path (e.g. `"/src/App.tsx"`). */
  path: string;
  /** Display name (usually the last path segment). */
  name: string;
  /** `"file"` or `"dir"`. */
  kind: FileKind;
  /** Size in bytes (optional; shown for files and used by size sorting). */
  size?: number;
  /** Last-modified timestamp, ISO 8601 (optional; used by mtime sorting). */
  mtime?: string;
  /**
   * Dirs only: `false` = known-empty (no expand affordance), `true` = has
   * children, `undefined` = unknown (expandable when a provider is present).
   */
  hasChildren?: boolean;
  /** Disabled entries render dimmed and cannot be selected, expanded, or navigated into. */
  disabled?: boolean;
}

/**
 * JSON-friendly snapshot node — a {@link FileEntry} plus optionally
 * materialized children. `children: undefined` on a dir = unknown depth (a
 * provider fills it lazily in hybrid mode); `children: []` = known-empty.
 */
export interface FileSnapshotNode extends FileEntry {
  children?: FileSnapshotNode[];
}

/** Async data source for provider mode. Works against local FS, HTTP, MCP bridges, SSH adapters — anything that resolves a listing. */
export interface FileBrowserProvider {
  /**
   * Load the direct children of `path`. Called lazily — only for the current
   * directory and explicitly expanded folders. The component never walks the
   * tree eagerly.
   */
  loadChildren: (path: string) => Promise<FileEntry[]>;
}

/** Which entry kinds are selectable. */
export type FileSelectMode = "file" | "directory" | "both";

export type FileSortField = "name" | "size" | "mtime";
export type FileSortDirection = "asc" | "desc";

/** Sort order for directory listings. Directories always sort before files. */
export interface FileSort {
  by: FileSortField;
  direction: FileSortDirection;
}

/** Per-path load lifecycle for provider mode. */
export type FileLoadStatus = "idle" | "loading" | "loaded" | "error";

export interface FileBrowserProps {
  /** Async data source (provider mode). Folders load on first expand — never an eager walk. */
  provider?: FileBrowserProvider;
  /**
   * JSON-friendly tree value (snapshot mode). Replace or patch it from outside
   * as stream chunks land — the component treats it as the source of truth for
   * every path it covers. May be combined with `provider` (hybrid): the
   * snapshot seeds, the provider fills unknown-depth folders.
   */
  snapshot?: FileSnapshotNode[];
  /** Which entry kinds are selectable (default `"file"`). Non-selectable entries stay browsable. */
  select?: FileSelectMode;
  /** Allow selecting multiple entries; `value` becomes `string[]` (default `false`). */
  multiple?: boolean;
  /** Controlled selection — a path, an array of paths (`multiple`), or `null`. */
  value?: string | string[] | null;
  /** Initial selection (uncontrolled). */
  defaultValue?: string | string[] | null;
  /** Called with the next selection and the matching known entries. */
  onChange?: (value: string | string[] | null, entries: FileEntry[]) => void;
  /** Controlled current directory. */
  path?: string;
  /** Initial current directory (uncontrolled, default `"/"`). */
  defaultPath?: string;
  /** Called when the current directory changes (breadcrumb click, path input, double-clicked folder). */
  onPathChange?: (path: string) => void;
  /** Controlled expanded folder paths. */
  expandedPaths?: string[];
  /** Initially expanded folder paths (uncontrolled). */
  defaultExpandedPaths?: string[];
  /** Called when the expanded set changes. */
  onExpandedChange?: (paths: string[]) => void;
  /** Controlled sort order. */
  sort?: FileSort;
  /** Initial sort order (uncontrolled, default `{ by: "name", direction: "asc" }`). */
  defaultSort?: FileSort;
  /** Called when the sort order changes. */
  onSortChange?: (sort: FileSort) => void;
  /** Controlled name filter — a client-side substring match over loaded nodes. */
  filter?: string;
  /** Initial name filter (uncontrolled). */
  defaultFilter?: string;
  /** Called when the name filter changes. */
  onFilterChange?: (filter: string) => void;
  /** Called when a provider load rejects; the failed folder shows an inline error with a retry. */
  onError?: (path: string, error: unknown) => void;
  /** Indent per nesting level in px (default `16`). */
  indentSize?: number;
  /** Show file/folder icons (default `true`). */
  showIcons?: boolean;
  /** Custom className for the outer shell. */
  className?: string;
  /**
   * Custom layout. When omitted, renders the default
   * `<FileBrowser.PathBar />` + `<FileBrowser.Toolbar />` + `<FileBrowser.Tree />`.
   */
  children?: ReactNode;
}

/** A flattened, visible row — the keyboard-navigation order of the tree pane. */
export interface FileBrowserRow {
  entry: FileEntry;
  depth: number;
  /** Whether the row shows an expand affordance. */
  expandable: boolean;
  /** Whether the row is currently expanded. */
  expanded: boolean;
  /** Path of the parent row, or `null` for top-level rows of the current directory. */
  parentPath: string | null;
}

export interface FileBrowserContextValue {
  // Data
  /** Known children of a path (snapshot first, then provider cache), or `undefined` when not yet loaded. */
  entriesFor: (path: string) => FileEntry[] | undefined;
  /** Children of a path after the name filter + sort are applied (empty when unknown). */
  visibleChildrenFor: (path: string) => FileEntry[];
  statusFor: (path: string) => FileLoadStatus;
  errorFor: (path: string) => string | undefined;
  /** Request a lazy load of a path's children (no-op without a provider or when already known/loading). */
  loadPath: (path: string, options?: { reload?: boolean }) => void;
  hasProvider: boolean;
  // Navigation
  path: string;
  /** Change the current directory (also clears the name filter and resets roving focus). */
  navigate: (path: string) => void;
  // Expansion
  expandedPaths: string[];
  toggleExpanded: (path: string) => void;
  // Selection
  select: FileSelectMode;
  multiple: boolean;
  selectedPaths: string[];
  isSelected: (path: string) => boolean;
  isSelectable: (entry: FileEntry) => boolean;
  selectEntry: (entry: FileEntry) => void;
  // Sort + filter
  sort: FileSort;
  setSort: (sort: FileSort) => void;
  filter: string;
  setFilter: (filter: string) => void;
  // Keyboard / roving focus
  visibleRows: FileBrowserRow[];
  focusedPath: string | null;
  setFocusedPath: (path: string | null) => void;
  /** The row that currently owns `tabIndex={0}`. */
  tabFocusPath: string | null;
  focusRow: (path: string) => void;
  registerRow: (path: string, el: HTMLElement | null) => void;
  // Presentation
  indentSize: number;
  showIcons: boolean;
}

export interface FileBrowserPathBarProps {
  /** Allow switching to the editable path input (default `true`). */
  editable?: boolean;
  /** Placeholder for the path input. */
  placeholder?: string;
  className?: string;
}

export interface FileBrowserToolbarProps {
  /** Placeholder for the name filter input (default `"Filter"`). */
  filterPlaceholder?: string;
  className?: string;
}

export interface FileBrowserTreeProps {
  /** Accessible label for the tree (default `"Files"`). */
  ariaLabel?: string;
  className?: string;
}

export interface FileBrowserNodeProps {
  entry: FileEntry;
  depth: number;
}
