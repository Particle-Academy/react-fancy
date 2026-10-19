import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Tooltip } from "../Tooltip";
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
const PREVIEW_BASE = "max-w-xs whitespace-pre-wrap break-all text-xs";

/** An image's thumbnail, made from the File only while the preview is open. */
function ImageThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof URL.createObjectURL !== "function") return;
    const made = URL.createObjectURL(file);
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [file]);

  return url ? (
    <img src={url} alt="" className="max-h-40 max-w-[16rem] rounded" />
  ) : (
    <span>{file.name}</span>
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
 * The hover preview is a portalled `Tooltip`, so the scrolling input cannot clip it.
 */
export function InlinePill({
  preview,
  previewChars,
  renderPastePreview,
  classNames,
  disabled,
  onExpand,
}: InlinePillProps) {
  const id = preview.kind === "text" ? preview.paste.id : preview.image.id;
  const content = (
    <span data-react-fancy-composer-paste-pill-preview={id}>
      {renderPastePreview?.(preview) ??
        (preview.kind === "text" ? (
          endsOf(preview.paste.text, previewChars)
        ) : (
          <ImageThumb file={preview.image.file} />
        ))}
    </span>
  );
  const tooltipClass = cn(PREVIEW_BASE, classNames?.preview);

  if (preview.kind === "image") {
    return (
      <Tooltip content={content} className={tooltipClass}>
        <span
          data-react-fancy-composer-image-pill={id}
          role="img"
          aria-label={preview.image.label}
          className={cn(PILL_BASE, IMAGE_PILL, classNames?.pill, classNames?.imagePill)}
        >
          {preview.image.label}
        </span>
      </Tooltip>
    );
  }

  const count = withSeparators(preview.paste.text.length);

  return (
    <Tooltip content={content} className={tooltipClass}>
      <button
        type="button"
        data-react-fancy-composer-paste-pill={id}
        onClick={() => onExpand(id)}
        disabled={disabled}
        aria-label={`Insert this pasted text, ${count} characters`}
        className={cn(PILL_BASE, TEXT_PILL, classNames?.pill, classNames?.textPill)}
      >
        Pasted text · {count} characters
      </button>
    </Tooltip>
  );
}
