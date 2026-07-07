import { Fragment, useState } from "react";
import { ChevronRight, Pencil } from "lucide-react";
import { cn } from "../../utils/cn";
import { useFileBrowser } from "./FileBrowser.context";
import { normalizePath, pathSegments } from "./FileBrowser.utils";
import type { FileBrowserPathBarProps } from "./FileBrowser.types";

// Segment styling mirrors Breadcrumbs.Item (the Breadcrumbs component itself
// is href-only and collapses to a dropdown on mobile, so the path bar renders
// its own always-visible, click-to-navigate trail).
const SEGMENT_CLASS =
  "shrink-0 rounded text-[13px] text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300";
const ACTIVE_SEGMENT_CLASS = "shrink-0 truncate text-[13px] font-medium text-zinc-900 dark:text-white";

/**
 * Breadcrumb trail over the current directory plus an editable path input —
 * type a POSIX-style path and press Enter to navigate (lazy-loading it in
 * provider mode). Escape or blur cancels the edit.
 */
export function FileBrowserPathBar({
  editable = true,
  placeholder = "/path/to/folder",
  className,
}: FileBrowserPathBarProps) {
  const { path, navigate } = useFileBrowser();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(path);
    setEditing(true);
  };

  const commit = () => {
    navigate(normalizePath(draft));
    setEditing(false);
  };

  const segments = pathSegments(path);
  const atRoot = segments.length === 0;

  return (
    <div
      data-react-fancy-file-browser-path=""
      className={cn(
        "flex items-center gap-1 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-700",
        className,
      )}
    >
      {editing ? (
        <input
          data-react-fancy-file-browser-path-input=""
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          onBlur={() => setEditing(false)}
          autoFocus
          spellCheck={false}
          placeholder={placeholder}
          aria-label="Path"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-2 py-0.5 font-mono text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-blue-400 dark:border-zinc-600 dark:text-zinc-300"
        />
      ) : (
        <nav
          aria-label="Path"
          onDoubleClick={editable ? startEdit : undefined}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        >
          {atRoot ? (
            <span data-react-fancy-file-browser-path-segment="" aria-current="location" className={ACTIVE_SEGMENT_CLASS}>
              /
            </span>
          ) : (
            <button
              type="button"
              data-react-fancy-file-browser-path-segment=""
              onClick={() => navigate("/")}
              className={SEGMENT_CLASS}
            >
              /
            </button>
          )}
          {segments.map((segment, i) => {
            const last = i === segments.length - 1;
            return (
              <Fragment key={segment.path}>
                {i > 0 && (
                  <ChevronRight size={12} aria-hidden="true" className="shrink-0 text-zinc-400" />
                )}
                {last ? (
                  <span
                    data-react-fancy-file-browser-path-segment=""
                    aria-current="location"
                    className={ACTIVE_SEGMENT_CLASS}
                  >
                    {segment.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    data-react-fancy-file-browser-path-segment=""
                    onClick={() => navigate(segment.path)}
                    className={SEGMENT_CLASS}
                  >
                    {segment.label}
                  </button>
                )}
              </Fragment>
            );
          })}
        </nav>
      )}
      {editable && !editing && (
        <button
          type="button"
          aria-label="Edit path"
          onClick={startEdit}
          className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

FileBrowserPathBar.displayName = "FileBrowserPathBar";
