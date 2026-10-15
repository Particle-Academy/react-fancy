import type { ReactNode } from "react";

/*
 * `HeldPaste` now lives with `usePastePills`, re-exported here so the import path
 * that 5.31.0 published keeps working.
 *
 * It moved because the hook is the general primitive and the component is one of
 * its callers — a hook depending on a component's types is the dependency the wrong
 * way round.
 */
import type { HeldPaste } from "../../hooks/use-paste-pills";
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

export interface ComposerSubmitExtras {
  /**
   * Images still pasted into the message when it was sent, in the order they
   * appear in it. Each one's place in the sent text is marked `[Pasted image N]`,
   * matching its `label`.
   */
  images: HeldImage[];
}

export interface ComposerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /**
   * The second argument only ever carries anything with `pasteImages` on. A
   * one-argument handler stays valid.
   */
  onSubmit?: (value: string, extras: ComposerSubmitExtras) => void;
  placeholder?: string;
  actions?: ReactNode;
  disabled?: boolean;
  className?: string;
  /**
   * Hold a paste of at least this many characters as a pill, instead of inserting
   * it. Try 500 — about a long paragraph.
   *
   * **Omit it and paste behaves exactly as it always has.** Opt-in on purpose:
   * paste is a fundamental interaction and this library is past 1.0, so a minor
   * release must not quietly change what pasting does for every consumer. There is
   * no default threshold for the same reason.
   *
   * Below the threshold nothing changes at all — no prevented event, no pill, no
   * ceremony for an address or a name.
   */
  pasteThreshold?: number;
  /**
   * Where a pill goes.
   *
   * - `"above"` (default, and the only behaviour before 5.38.0) — in a row above
   *   the input; a send appends held text after what was typed.
   * - `"inline"` — **in the message, where the paste happened.** A text pill gets
   *   a line to itself; clicking it puts the full text back exactly there; an
   *   image pill sits in the sentence. Backspace deletes a pill like a character.
   *
   * With `"inline"`, `value` carries a marker for each pill (see `pasteMarker`),
   * because the message is then the one record of what is attached and where.
   * `onSubmit` always receives the expanded text, never a marker.
   */
  pastePlacement?: "above" | "inline";
  /**
   * Hold a pasted IMAGE as a pill (`"inline"` placement only). Off by default —
   * turning it on is a promise to read `onSubmit`'s second argument, because a pill
   * reads as "attached" and an image a host never sends is an attachment the
   * person believes went and did not.
   *
   * A clipboard carrying text as well as an image (copying from a document often
   * includes a picture of the selection) pastes the TEXT: the image there is a
   * rendering, not the thing that was copied.
   */
  pasteImages?: boolean;
  /** Characters of a held text paste shown at EACH end of its hover preview. Default 20. */
  previewChars?: number;
  /** Replace the hover popover's content. Its box is styled by `classNames.preview`. */
  renderPastePreview?: (preview: ComposerPastePreview) => ReactNode;
  /** Restyle the pills and their popover. */
  classNames?: ComposerPasteClassNames;
  /**
   * The held pastes, if you want to own them.
   *
   * Controllable rather than internal because the component contract forbids
   * internal-only state for anything an agent might need to read or write — an
   * agent driving this surface has to be able to see that a paste is attached, and
   * to attach one itself.
   */
  heldPastes?: HeldPaste[];
  onHeldPastesChange?: (pastes: HeldPaste[]) => void;
  /** The held images, if you want to own them. Same reasoning as `heldPastes`. */
  heldImages?: HeldImage[];
  onHeldImagesChange?: (images: HeldImage[]) => void;
}
