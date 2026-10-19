import type { InputHTMLAttributes, ReactNode } from "react";
import type { InputBaseProps, InputAffixProps } from "../inputs.types";
import type {
  ComposerPasteClassNames,
  ComposerPastePreview,
  HeldImage,
  HeldPaste,
} from "../../PastePills";

export interface InputProps
  extends InputBaseProps,
    InputAffixProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "prefix"> {
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  onValueChange?: (value: string) => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  /**
   * Show a toggle that reveals the value, for `type="password"`.
   *
   * Ignored on other input types — a reveal on a field that is already visible
   * is a button that does nothing.
   *
   * It occupies the trailing slot, so it replaces `trailing` when both are set:
   * the two would otherwise stack in the same corner, and the reveal is the one
   * a person needs to click.
   */
  reveal?: boolean;
  /** Controlled reveal state. Omit to let the input own it. */
  revealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** Accessible label for the toggle. Defaults to "Show password" / "Hide password". */
  revealLabel?: string;
  hideLabel?: string;
  /**
   * Hold a paste of at least this many characters as a pill in the field, as
   * `Composer` and `PromptInput` do — same code, from `PastePills`. Try 500.
   *
   * **Omit it (and `pasteImages`) and this is a plain `<input>`, exactly as
   * before.** Setting either swaps it for a single-line editor that can hold a
   * pill, plus a hidden `<input name={name}>` that posts the value with every pill
   * expanded, so a native form submit sends the whole paste. `ref` then points at
   * that hidden input; `onValueChange` receives the value with a marker for each
   * pill (see `pasteMarker`), and `onChange` is not called.
   */
  pasteThreshold?: number;
  /**
   * Hold a pasted image as a pill, and put the file in a hidden
   * `<input type="file" multiple>` in the same form so a submit posts it. The text
   * marks where it sat as `[Pasted image N]`.
   */
  pasteImages?: boolean;
  /**
   * The field name pasted files are posted under. Defaults to `{name}_files[]`
   * (an array for PHP / Laravel); without either, the files are held but not
   * posted.
   */
  pasteFilesName?: string;
  /** Characters of a held paste shown at EACH end of its hover preview. Default 20. */
  previewChars?: number;
  renderPastePreview?: (preview: ComposerPastePreview) => ReactNode;
  pasteClassNames?: ComposerPasteClassNames;
  /** The held pastes and images, if you want to own them (an agent attaching one, a restored draft). */
  heldPastes?: HeldPaste[];
  onHeldPastesChange?: (pastes: HeldPaste[]) => void;
  heldImages?: HeldImage[];
  onHeldImagesChange?: (images: HeldImage[]) => void;
}
