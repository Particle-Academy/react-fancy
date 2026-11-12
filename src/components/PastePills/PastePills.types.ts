import type { HeldPaste } from "./use-paste-pills";
import type { HeldImage } from "./paste-markers";

export type { HeldPaste, HeldImage };

/** What a hover preview is being asked to show. */
export type ComposerPastePreview =
  | { kind: "text"; paste: HeldPaste }
  | { kind: "image"; image: HeldImage };

/**
 * Classes for the paste pills, MERGED onto the defaults rather than replacing them,
 * so a restyle can be one class or a whole new look.
 */
export interface ComposerPasteClassNames {
  /** Every pill, text or image. */
  pill?: string;
  /** Text pills only — `Pasted text · 669 characters`. */
  textPill?: string;
  /** Image pills only — `Pasted image 1`. */
  imagePill?: string;
  /** The hover popover. */
  preview?: string;
  /** The × discard control (beside-the-input placement only; inline pills are backspaced). */
  remove?: string;
  /** The editable surface itself. */
  input?: string;
}

/**
 * The words on paste pills, for translation. `{count}` is the character count
 * with thousands separators (`2,036`), `{label}` a host-supplied pill label,
 * `{n}` an image's arrival number.
 */
export interface PastePillLabels {
  /** A text pill's visible text. @default "Pasted text · {count} characters" */
  pastedText?: string;
  /** A text pill's accessible name: clicking it inserts the text. @default "Insert this pasted text, {count} characters" */
  insertPaste?: string;
  /** The same, for a pill the host named with `label`. @default "Insert this pasted text: {label}, {count} characters" */
  insertNamedPaste?: string;
  /** The x that discards a pill above the input. @default "Discard this pasted text" */
  discardPaste?: string;
  /**
   * A pasted image's label, on its pill and in the sent text (`[Pasted image 1]`).
   * Stored with the image when it is pasted. @default "Pasted image {n}"
   */
  pastedImage?: string;
  /** An image pill's preview while its thumbnail loads. @default "Loading preview…" */
  imagePreviewLoading?: string;
  /** An image pill's preview when its thumbnail cannot be shown. @default "Preview unavailable" */
  imagePreviewError?: string;
}

export const DEFAULT_PASTE_PILL_LABELS = {
  pastedText: "Pasted text · {count} characters",
  insertPaste: "Insert this pasted text, {count} characters",
  insertNamedPaste: "Insert this pasted text: {label}, {count} characters",
  discardPaste: "Discard this pasted text",
  pastedImage: "Pasted image {n}",
} as const;

/** The same shapes under the names they have outside `Composer`. */
export type PastePreview = ComposerPastePreview;
export type PasteClassNames = ComposerPasteClassNames;
