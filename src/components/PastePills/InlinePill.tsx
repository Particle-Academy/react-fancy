import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Popover } from "../Popover";
import type { ComposerPasteClassNames, ComposerPastePreview } from "./PastePills.types";

/**
 * Thousands separators, written out rather than left to `toLocaleString()`.
 *
 * The number exists so someone can size the paste at a glance, and `2,036` sizes
 * faster than `2036`. It is not left to the runtime locale because the label beside
 * it ("Pasted text") is not localised either, so a locale-formatted number next to
 * an English noun would be half a translation.
 */
export function withSeparators(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** First and last N characters, middle elided. The ends say WHICH paste this is. */
export function endsOf(text: string, chars: number): string {
  if (text.length <= chars * 2) return text;

  return `${text.slice(0, chars)} … ${text.slice(-chars)}`;
}

const PILL_BASE =
  "inline-flex select-none items-center rounded-md px-2 py-0.5 text-xs leading-5 transition-colors";
const TEXT_PILL =
  "cursor-pointer bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";
const IMAGE_PILL =
  "bg-rose-100 font-medium text-rose-600 dark:bg-rose-500/20 dark:text-rose-300";
/** Merged onto the Popover panel's own defaults: tighter padding for a preview. */
const PREVIEW_BASE = "max-w-xs whitespace-pre-wrap break-all p-2 text-xs";

/**
 * An image's thumbnail, made from the File only while the preview is open.
 *
 * If the image cannot be shown — a Content-Security-Policy without `blob:` in
 * `img-src` is the usual reason — the label is shown instead. A broken `<img>`
 * with an empty `alt` renders as nothing at all, which is how a preview ends up
 * as an empty box.
 */
function ImageThumb({ file, label }: { file: File; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (typeof URL.createObjectURL !== "function") return;
    const made = URL.createObjectURL(file);
    setUrl(made);
    setFailed(false);
    return () => URL.revokeObjectURL(made);
  }, [file]);

  return url && !failed ? (
    <img
      src={url}
      alt={label}
      onError={() => setFailed(true)}
      className="block max-h-40 max-w-[16rem] rounded"
    />
  ) : (
    <span>{label}</span>
  );
}

interface InlinePillProps {
  preview: ComposerPastePreview;
  previewChars: number;
  renderPastePreview?: (preview: ComposerPastePreview) => ReactNode;
  classNames?: ComposerPasteClassNames;
  disabled: boolean;
  onExpand: (id: string) => void;
}

/**
 * One pill inside the message, portalled by `Composer` into a placeholder the
 * editor made. Internal — its own file so its props are not read as `Composer`'s.
 *
 * The preview is a hover `Popover` (portalled, so the scrolling input cannot clip
 * it), and it opens on FOCUS too, so a keyboard user reaches the same preview. It
 * was a `Tooltip` until 5.51.0; a tooltip is for a short label, not an image.
 */
export function InlinePill({
  preview,
  previewChars,
  renderPastePreview,
  classNames,
  disabled,
  onExpand,
}: InlinePillProps) {
  const [open, setOpen] = useState(false);
  const id = preview.kind === "text" ? preview.paste.id : preview.image.id;
  const content = (
    <span data-react-fancy-composer-paste-pill-preview={id}>
      {renderPastePreview?.(preview) ??
        (preview.kind === "text" ? (
          endsOf(preview.paste.text, previewChars)
        ) : (
          <ImageThumb file={preview.image.file} label={preview.image.label} />
        ))}
    </span>
  );
  const focusOpen = {
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  };

  const pill =
    preview.kind === "image" ? (
      <span
        data-react-fancy-composer-image-pill={id}
        role="img"
        tabIndex={0}
        aria-label={preview.image.label}
        {...focusOpen}
        className={cn(PILL_BASE, IMAGE_PILL, classNames?.pill, classNames?.imagePill)}
      >
        {preview.image.label}
      </span>
    ) : (
      <button
        type="button"
        data-react-fancy-composer-paste-pill={id}
        onClick={() => onExpand(id)}
        disabled={disabled}
        aria-label={`Insert this pasted text, ${withSeparators(preview.paste.text.length)} characters`}
        {...focusOpen}
        className={cn(PILL_BASE, TEXT_PILL, classNames?.pill, classNames?.textPill)}
      >
        Pasted text · {withSeparators(preview.paste.text.length)} characters
      </button>
    );

  return (
    <Popover hover open={open} onOpenChange={setOpen} placement="top">
      <Popover.Trigger>{pill}</Popover.Trigger>
      <Popover.Content className={cn(PREVIEW_BASE, classNames?.preview)}>
        {content}
      </Popover.Content>
    </Popover>
  );
}
