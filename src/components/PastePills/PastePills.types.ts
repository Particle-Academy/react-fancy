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

/** The same shapes under the names they have outside `Composer`. */
export type PastePreview = ComposerPastePreview;
export type PasteClassNames = ComposerPasteClassNames;
