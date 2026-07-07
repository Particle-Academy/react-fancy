import { ChevronRight, CircleAlert, Loader2, RotateCw } from "lucide-react";
import { cn } from "../../utils/cn";
import { useFileBrowser } from "./FileBrowser.context";
import { formatFileSize, isEntryExpandable } from "./FileBrowser.utils";
import type { FileBrowserNodeProps } from "./FileBrowser.types";

// ---------------------------------------------------------------------------
// Icons — mirror TreeNav's file/folder icons so both tree surfaces look the
// same (TreeNav keeps them internal; duplicating ~40 lines beats widening its
// public API).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Status rows — loading / error / empty placeholders inside the tree. Not
// treeitems (they never receive roving focus); the owning folder carries
// `aria-busy` while its children load.
// ---------------------------------------------------------------------------

export interface FileBrowserStatusRowProps {
  depth: number;
  kind: "loading" | "error" | "empty" | "no-matches" | "unknown";
  message?: string;
  onRetry?: () => void;
}

export function FileBrowserStatusRow({ depth, kind, message, onRetry }: FileBrowserStatusRowProps) {
  const { indentSize } = useFileBrowser();
  const paddingLeft = depth * indentSize + 4 + 18;

  if (kind === "error") {
    return (
      <div
        role="none"
        data-react-fancy-file-browser-status="error"
        className="flex items-center gap-1.5 py-0.5 pr-2 text-xs text-red-600 dark:text-red-400"
        style={{ paddingLeft }}
      >
        <CircleAlert size={12} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{message || "Failed to load"}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <RotateCw size={11} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="none"
      data-react-fancy-file-browser-status={kind}
      className="flex items-center gap-1.5 py-0.5 text-xs text-zinc-400 italic dark:text-zinc-500"
      style={{ paddingLeft }}
    >
      {kind === "loading" && <Loader2 size={12} className="shrink-0 animate-spin" aria-hidden="true" />}
      <span className="truncate">
        {kind === "loading" ? "Loading…" : kind === "empty" ? "Empty" : kind === "no-matches" ? "No matches" : "No entries"}
      </span>
    </div>
  );
}

FileBrowserStatusRow.displayName = "FileBrowserStatusRow";

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

export function FileBrowserNode({ entry, depth }: FileBrowserNodeProps) {
  const {
    entriesFor, visibleChildrenFor, statusFor, errorFor, loadPath, hasProvider,
    expandedPaths, toggleExpanded, navigate,
    isSelected, isSelectable, selectEntry,
    tabFocusPath, setFocusedPath, focusRow, registerRow,
    indentSize, showIcons,
  } = useFileBrowser();

  const rawChildren = entriesFor(entry.path);
  const childrenKnown = rawChildren !== undefined;
  const expandable = isEntryExpandable(entry, rawChildren, hasProvider);
  const expanded = expandable && expandedPaths.includes(entry.path);
  const status = statusFor(entry.path);
  const selectable = isSelectable(entry);
  const selected = isSelected(entry.path);
  const loading = expanded && !childrenKnown && status === "loading";
  const paddingLeft = depth * indentSize + 4;
  const ext = entry.name.includes(".") ? entry.name.split(".").pop() : undefined;

  const handleClick = () => {
    if (entry.disabled) return;
    setFocusedPath(entry.path);
    focusRow(entry.path);
    if (selectable) selectEntry(entry);
    if (expandable) toggleExpanded(entry.path);
  };

  const handleDoubleClick = () => {
    if (entry.disabled || entry.kind !== "dir") return;
    navigate(entry.path);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entry.disabled && expandable) toggleExpanded(entry.path);
  };

  const visibleChildren = expanded && childrenKnown ? visibleChildrenFor(entry.path) : [];

  return (
    <div
      role="treeitem"
      data-react-fancy-file-browser-node=""
      data-path={entry.path}
      data-kind={entry.kind}
      aria-level={depth + 1}
      aria-expanded={expandable ? expanded : undefined}
      aria-selected={selectable ? selected : undefined}
      aria-disabled={entry.disabled || undefined}
      aria-busy={loading || undefined}
      tabIndex={tabFocusPath === entry.path ? 0 : -1}
      ref={(el) => registerRow(entry.path, el)}
      onFocus={(e) => {
        if (e.target === e.currentTarget) setFocusedPath(entry.path);
      }}
      className="group outline-none"
    >
      <div
        data-react-fancy-file-browser-row=""
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={cn(
          "flex w-full cursor-pointer items-center gap-1 rounded-md py-0.5 pr-2 text-left text-[13px] transition-colors select-none",
          selected
            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
          entry.disabled && "pointer-events-none opacity-40",
          "group-focus-visible:ring-2 group-focus-visible:ring-blue-500/40 group-focus-visible:ring-inset",
        )}
        style={{ paddingLeft }}
      >
        {expandable ? (
          loading ? (
            <Loader2 size={14} className="shrink-0 animate-spin text-zinc-400" aria-hidden="true" />
          ) : (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={handleChevronClick}
              className="flex shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <ChevronRight
                size={14}
                className={cn("transition-transform duration-150", expanded && "rotate-90")}
              />
            </button>
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {showIcons &&
          (entry.kind === "dir" ? <FolderIcon open={expanded} /> : <FileIcon ext={ext} />)}
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
        {entry.kind === "file" && entry.size !== undefined && (
          <span className="shrink-0 text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">
            {formatFileSize(entry.size)}
          </span>
        )}
      </div>

      {expanded && (
        <div role="group" data-react-fancy-file-browser-node-children="">
          {/* An expanded-but-unknown folder is only reachable with a provider;
              "idle" means its lazy load is about to start, so render it as
              loading (keeps SSR output and the first client frame identical). */}
          {!childrenKnown && (status === "loading" || status === "idle") && (
            <FileBrowserStatusRow depth={depth + 1} kind="loading" />
          )}
          {!childrenKnown && status === "error" && (
            <FileBrowserStatusRow
              depth={depth + 1}
              kind="error"
              message={errorFor(entry.path)}
              onRetry={() => loadPath(entry.path, { reload: true })}
            />
          )}
          {childrenKnown &&
            (visibleChildren.length > 0 ? (
              visibleChildren.map((child) => (
                <FileBrowserNode key={child.path} entry={child} depth={depth + 1} />
              ))
            ) : (
              <FileBrowserStatusRow
                depth={depth + 1}
                kind={rawChildren!.length === 0 ? "empty" : "no-matches"}
              />
            ))}
        </div>
      )}
    </div>
  );
}

FileBrowserNode.displayName = "FileBrowserNode";
