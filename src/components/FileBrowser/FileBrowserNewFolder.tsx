import { useEffect, useRef, useState } from "react";
import { FolderPlus } from "lucide-react";
import { cn } from "../../utils/cn";
import { useFileBrowser } from "./FileBrowser.context";
import { validateFolderName } from "./FileBrowser.utils";

/**
 * The "New folder" affordance — rendered only when the host opted in by
 * supplying `onCreateFolder`.
 *
 * ## Why an inline input and not `window.prompt`
 *
 * A prompt blocks the event loop, cannot be styled or themed, is unusable on
 * mobile, and — the one that matters for this suite — cannot be driven by an
 * agent. The Human+ contract asks that every interactive element carry a stable
 * handle an agent can target; a native dialog has none.
 *
 * ## Why validation lives here
 *
 * The browser already knows what is in the current directory. The host would
 * have to round-trip to find out, so a duplicate name becomes a failed write
 * and an error toast instead of a message before anything is attempted. Name
 * rules that are about PATHS rather than policy — separators, `.`, `..` — are
 * checked here too: those are not names, and forwarding them makes the host
 * decide what a traversal attempt means.
 *
 * Anything else is the host's call. This does not guess at case-sensitivity,
 * reserved Windows device names, or length limits, because the answer depends
 * on a filesystem the browser cannot see.
 */
export function FileBrowserNewFolder({ className }: { className?: string }) {
  const { path, entriesFor, onCreateFolder, loadPath, hasProvider } = useFileBrowser();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Navigating away mid-name would otherwise create the folder in a directory
  // the person is no longer looking at.
  useEffect(() => {
    setOpen(false);
    setName("");
    setError(null);
  }, [path]);

  if (!onCreateFolder) return null;

  const siblings = entriesFor(path) ?? [];
  const problem = validateFolderName(name, siblings);
  const canSubmit = !busy && problem === null;

  const close = () => {
    setOpen(false);
    setName("");
    setError(null);
  };

  const submit = async () => {
    if (busy) return;
    const trimmed = name.trim();
    const invalid = validateFolderName(name, siblings);
    if (invalid) {
      setError(invalid);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onCreateFolder({ parentPath: path, name: trimmed });
      // Only on success. Reloading after a failure would hide the failure
      // behind an unchanged listing, and closing would claim it worked.
      if (hasProvider) loadPath(path, { reload: true });
      setOpen(false);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        data-react-fancy-file-browser-new-folder=""
        onClick={() => setOpen(true)}
        title={`New folder in ${path}`}
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-zinc-500 transition-colors",
          "hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
          className,
        )}
      >
        <FolderPlus size={13} aria-hidden="true" />
        New folder
      </button>
    );
  }

  // Show the reason as soon as there is a name to judge — but not for an empty
  // field, which is "not typed yet" rather than wrong.
  //
  // This pairs with the disabled submit deliberately. A disabled button and no
  // explanation is the worst combination: the person has typed something
  // reasonable, the control is dead, and nothing says the folder already
  // exists. Either the button explains on click or the message is already
  // there; this takes the second, so the answer arrives before they reach for
  // the button.
  const shown = error ?? (name.trim() !== "" ? problem : null);

  return (
    <div
      data-react-fancy-file-browser-new-folder-form=""
      className={cn("flex shrink-0 flex-col gap-0.5", className)}
    >
      <div className="flex items-center gap-1">
        <FolderPlus size={13} aria-hidden="true" className="shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          data-react-fancy-file-browser-new-folder-input=""
          value={name}
          disabled={busy}
          aria-label="New folder name"
          aria-invalid={shown ? true : undefined}
          spellCheck={false}
          placeholder="Folder name"
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          className={cn(
            "w-32 min-w-0 rounded-md border px-1.5 py-0.5 text-xs outline-none",
            "bg-transparent text-zinc-700 placeholder:text-zinc-400 dark:text-zinc-300",
            shown ? "border-red-400 dark:border-red-500" : "border-zinc-200 dark:border-zinc-700",
          )}
        />
        <button
          type="button"
          data-react-fancy-file-browser-new-folder-submit=""
          disabled={!canSubmit}
          onClick={() => void submit()}
          className="rounded-md px-1.5 py-0.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-400 dark:hover:bg-violet-500/10"
        >
          {busy ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          data-react-fancy-file-browser-new-folder-cancel=""
          onClick={close}
          className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
      {shown && (
        <p
          data-react-fancy-file-browser-new-folder-error=""
          role="alert"
          className="pl-4 text-[11px] text-red-600 dark:text-red-400"
        >
          {shown}
        </p>
      )}
    </div>
  );
}

FileBrowserNewFolder.displayName = "FileBrowserNewFolder";
