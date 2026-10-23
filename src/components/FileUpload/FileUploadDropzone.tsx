import { useCallback, useId, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "../../utils/cn";
import { useFileUpload } from "./FileUpload.context";
import type { FileUploadDropzoneProps } from "./FileUpload.types";

/** Accessible name of the browse trigger when the zone has custom children. */
const DEFAULT_BROWSE_LABEL = "Browse files";

/** The default zone copy; it doubles as the trigger's accessible name. */
const DEFAULT_COPY = "Drop files here or click to browse";

/*
 * Keyboard access (after 5.59.0). Until then the zone was a clickable div around a
 * display:none input: no tab stop, no role, no key handler, so a keyboard or
 * switch user could not open the picker at all.
 *
 * The trigger is a REAL <button type="button">, not a div with role="button":
 * focus, Enter and Space (Space on keyup, cancelled by moving off) then come
 * from the platform instead of a key handler that has to get those right.
 *
 *  - Default content: the button wraps the icon and the copy, so the visible
 *    text IS its accessible name and the look is unchanged.
 *  - Custom children: they may contain their own interactive content, which a
 *    button must not wrap, so the button is visually hidden beside them and the
 *    ZONE draws the focus ring (has-focus-visible) — the focus indicator is
 *    never invisible.
 *
 * A click anywhere on the zone still opens the picker, as before; a click on
 * the button bubbles to the zone and is handled there once.
 */
export function FileUploadDropzone({
  children,
  className,
  browseLabel,
}: FileUploadDropzoneProps) {
  const { addFiles, disabled, accept, multiple } = useFileUpload();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const custom = children !== undefined && children !== null;
  const inputLabel = browseLabel ?? (custom ? DEFAULT_BROWSE_LABEL : DEFAULT_COPY);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      addFiles(e.dataTransfer.files);
    },
    [addFiles, disabled],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      // The input's own click bubbles back up here; re-entering would ask for a
      // second picker.
      if (e.target === inputRef.current) return;
      inputRef.current?.click();
    },
    [disabled],
  );

  return (
    <div
      data-react-fancy-file-upload-dropzone=""
      data-drag-over={dragOver ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled || undefined}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-[color,background-color,border-color,box-shadow]",
        "has-focus-visible:ring-2 has-focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))]/40 dark:has-focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]/40",
        dragOver
          ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950"
          : "border-[color:var(--fancy-border-strong,var(--color-zinc-300))] hover:border-zinc-400 dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-700))] dark:hover:border-zinc-500",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="hidden"
        tabIndex={-1}
        aria-label={inputLabel}
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);

          // Reset, or choosing the SAME file again fires no `change` event at
          // all and the gesture is simply dead — "remove it, then re-add it"
          // and "retry the import that just failed" both stop working. The
          // component never sees those files to reject them; it is not asked.
          e.target.value = "";
        }}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
      />
      {custom ? (
        <>
          {children}
          <button
            type="button"
            data-react-fancy-file-upload-browse=""
            aria-controls={inputId}
            disabled={disabled}
            className="sr-only"
          >
            {browseLabel ?? DEFAULT_BROWSE_LABEL}
          </button>
        </>
      ) : (
        <button
          type="button"
          data-react-fancy-file-upload-browse=""
          aria-controls={inputId}
          aria-label={browseLabel}
          disabled={disabled}
          className="flex cursor-pointer flex-col items-center rounded-md outline-none disabled:cursor-not-allowed"
        >
          <Upload size={32} strokeWidth={1.5} aria-hidden="true" className="mb-2 text-zinc-400" />
          <span className="text-sm text-zinc-500">{DEFAULT_COPY}</span>
        </button>
      )}
    </div>
  );
}

FileUploadDropzone.displayName = "FileUploadDropzone";
