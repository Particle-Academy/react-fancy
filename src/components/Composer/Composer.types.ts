import type { ReactNode } from "react";

/*
 * The paste-pill shapes live with the shared core in `PastePills`, re-exported
 * here so the import paths that 5.31.0 and 5.38.0 published keep working.
 */
import type {
  ComposerPasteClassNames,
  ComposerPastePreview,
  HeldImage,
  HeldPaste,
} from "../PastePills/PastePills.types";

import type { SubmitRejection, SubmitResult } from "../../hooks/use-acknowledged-submit";

export type { ComposerPasteClassNames, ComposerPastePreview, HeldImage, HeldPaste };
export type { SubmitRejection, SubmitResult };

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
   *
   * **Return nothing and the message clears at once, as it always has.**
   *
   * Return a Promise to make the send acknowledged: the text and held pastes
   * stay, the send button is disabled and `aria-busy`, and a second send is
   * refused until it settles. The text stays editable meanwhile.
   *
   * - Resolves (to anything but `{ ok: false }`) → the message clears, unless
   *   anything changed it while it was in flight (the person, or a controlled
   *   prop), even back to the same text; the newer message is kept.
   * - Rejects, or resolves `{ ok: false, error? }` → everything is kept,
   *   `onSubmitError` is called and the failure is announced to screen readers.
   *
   * With a controlled `value` the clear is an `onChange("")` like any other; the
   * host decides whether to apply it.
   */
  onSubmit?: (
    value: string,
    extras: ComposerSubmitExtras,
  ) => void | Promise<SubmitResult>;
  /**
   * Called when a Promise from `onSubmit` rejects (with the reason) or resolves
   * `{ ok: false }` (with its `error`, or `undefined`). The message is kept.
   */
  onSubmitError?: (error: unknown) => void;
  placeholder?: string;
  actions?: ReactNode;
  /** Disables the text, the pills and the send. */
  disabled?: boolean;
  /**
   * Disables only the send: the text stays editable, Enter does not send. For
   * "the agent is still answering, but you can write the next message".
   */
  sendDisabled?: boolean;
  /**
   * Form field name for the text. On the textarea itself; with
   * `pastePlacement="inline"` on a hidden input carrying the expanded text,
   * since a contenteditable is not a form field. With the default placement,
   * held pastes are NOT in the textarea's value — read `onSubmit` for those.
   */
  name?: string;
  /**
   * `id` of the text field (textarea or inline editor), for a `<label htmlFor>`
   * or an agent. In either mode it is the one handle that does not change with
   * `pastePlacement`. Without it the field is found by
   * `data-react-fancy-composer-textarea` (default placement) or
   * `data-react-fancy-composer-input` (inline).
   */
  inputId?: string;
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
  /**
   * Submit pasted images with an enclosing `<form>`, under this field name.
   *
   * Renders a hidden `<input type="file" multiple>` that always holds the images
   * still in the message, in message order — delete a pill and its file leaves
   * the input. Needs `pasteImages`. Name it `photos[]` for a backend that
   * reads arrays from brackets (PHP, Laravel).
   */
  pasteFilesName?: string;
}
