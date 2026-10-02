import type { ReactNode } from "react";

/**
 * A paste held beside the composer rather than inserted into it.
 *
 * `text` is the whole thing. The pill shows a count and the two ends; nothing
 * truncates the content itself, because the point is to send it.
 */
export interface HeldPaste {
  id: string;
  text: string;
}

export interface ComposerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  actions?: ReactNode;
  disabled?: boolean;
  className?: string;
  /**
   * Hold a paste of at least this many characters beside the composer as a pill,
   * instead of inserting it. Try 500 — about a long paragraph.
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
   * The held pastes, if you want to own them.
   *
   * Controllable rather than internal because the component contract forbids
   * internal-only state for anything an agent might need to read or write — an
   * agent driving this surface has to be able to see that a paste is attached, and
   * to attach one itself.
   */
  heldPastes?: HeldPaste[];
  onHeldPastesChange?: (pastes: HeldPaste[]) => void;
}
