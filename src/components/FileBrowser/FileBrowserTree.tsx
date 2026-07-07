import { cn } from "../../utils/cn";
import { useFileBrowser } from "./FileBrowser.context";
import { FileBrowserNode, FileBrowserStatusRow } from "./FileBrowserNode";
import type { FileBrowserRow, FileBrowserTreeProps } from "./FileBrowser.types";

/**
 * The tree pane: ARIA `tree` semantics, roving tabindex, and full keyboard
 * navigation (arrows / Enter / Space / Home / End) over the flattened row
 * order. Lazy loads fire on expand only.
 */
export function FileBrowserTree({ ariaLabel = "Files", className }: FileBrowserTreeProps) {
  const ctx = useFileBrowser();
  const {
    path, entriesFor, visibleChildrenFor, statusFor, errorFor, loadPath, hasProvider,
    visibleRows, tabFocusPath, setFocusedPath, focusRow,
    toggleExpanded, isSelectable, selectEntry, navigate, multiple,
  } = ctx;

  const rootEntries = entriesFor(path);
  const rootStatus = statusFor(path);
  const rootChildren = rootEntries !== undefined ? visibleChildrenFor(path) : [];

  const moveTo = (row: FileBrowserRow) => {
    setFocusedPath(row.entry.path);
    focusRow(row.entry.path);
  };

  const activate = (row: FileBrowserRow) => {
    if (row.entry.disabled) return;
    if (isSelectable(row.entry)) selectEntry(row.entry);
    if (row.expandable) toggleExpanded(row.entry.path);
    else if (row.entry.kind === "dir" && !isSelectable(row.entry)) navigate(row.entry.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const rows = visibleRows;
    if (rows.length === 0) return;
    const index = rows.findIndex((row) => row.entry.path === tabFocusPath);
    const current = index >= 0 ? rows[index] : rows[0];

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (index < rows.length - 1) moveTo(rows[index + 1]);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (index > 0) moveTo(rows[index - 1]);
        break;
      case "Home":
        e.preventDefault();
        moveTo(rows[0]);
        break;
      case "End":
        e.preventDefault();
        moveTo(rows[rows.length - 1]);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (current.entry.disabled) break;
        if (current.expandable && !current.expanded) {
          toggleExpanded(current.entry.path);
        } else if (current.expanded) {
          const firstChild = rows[index + 1];
          if (firstChild && firstChild.parentPath === current.entry.path) moveTo(firstChild);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (current.expanded && !current.entry.disabled) {
          toggleExpanded(current.entry.path);
        } else if (current.parentPath) {
          const parent = rows.find((row) => row.entry.path === current.parentPath);
          if (parent) moveTo(parent);
        }
        break;
      case "Enter":
        e.preventDefault();
        activate(current);
        break;
      case " ":
        e.preventDefault();
        if (!current.entry.disabled) selectEntry(current.entry);
        break;
    }
  };

  return (
    <div
      role="tree"
      aria-label={ariaLabel}
      aria-multiselectable={multiple || undefined}
      data-react-fancy-file-browser-tree=""
      className={cn("min-h-0 flex-1 overflow-auto p-1", className)}
      onKeyDown={handleKeyDown}
    >
      {/* "idle" with a provider renders as loading too: loads fire in an
          effect, so this is what the server (and first client frame) shows
          right before the request starts — keeps SSR + hydration identical. */}
      {rootEntries === undefined && hasProvider && (rootStatus === "loading" || rootStatus === "idle") && (
        <FileBrowserStatusRow depth={0} kind="loading" />
      )}
      {rootEntries === undefined && rootStatus === "error" && (
        <FileBrowserStatusRow
          depth={0}
          kind="error"
          message={errorFor(path)}
          onRetry={() => loadPath(path, { reload: true })}
        />
      )}
      {rootEntries === undefined && rootStatus === "idle" && !hasProvider && (
        <FileBrowserStatusRow depth={0} kind="unknown" />
      )}
      {rootEntries !== undefined &&
        (rootChildren.length > 0 ? (
          rootChildren.map((entry) => (
            <FileBrowserNode key={entry.path} entry={entry} depth={0} />
          ))
        ) : (
          <FileBrowserStatusRow depth={0} kind={rootEntries.length === 0 ? "empty" : "no-matches"} />
        ))}
    </div>
  );
}

FileBrowserTree.displayName = "FileBrowserTree";
