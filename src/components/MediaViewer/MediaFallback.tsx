import { cn } from "../../utils/cn";

interface MediaFallbackProps {
  src: string;
  mime?: string;
  label?: string;
  className?: string;
}

/** Filename guess from a URL, ignoring query/hash and `data:`/`blob:` URLs. */
function basename(src: string): string | null {
  if (/^(data|blob):/i.test(src)) return null;
  const seg = src.split(/[?#]/, 1)[0].split("/").pop();
  return seg ? decodeURIComponent(seg) : null;
}

/**
 * Shown by `<MediaViewer>` when a source isn't a previewable media type — a
 * small themed card naming the file and offering a download.
 */
export function MediaFallback({ src, mime, label, className }: MediaFallbackProps) {
  const name = label || basename(src);
  return (
    <div
      data-react-fancy-media-fallback=""
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] p-6 text-center dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
        className,
      )}
    >
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        No preview available
      </span>
      {(name || mime) && (
        <span className="max-w-full truncate text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
          {name}
          {name && mime ? " · " : ""}
          {mime}
        </span>
      )}
      <a
        href={src}
        download={name ?? undefined}
        className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Download
      </a>
    </div>
  );
}
