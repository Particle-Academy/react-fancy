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

export type { HeldPaste };

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
