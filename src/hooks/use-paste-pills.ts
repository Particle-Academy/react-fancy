import { useCallback, useRef } from "react";
import { useControllableState } from "./use-controllable-state";

/**
 * A paste held beside a composer rather than inserted into it.
 *
 * There is deliberately **no `length` field.** It would be `text.length` and
 * nothing else, and a derived value stored beside its source is a value that can
 * disagree with it — the two drift the moment anything edits one. Read
 * `paste.text.length`.
 */
export interface HeldPaste {
  id: string;
  text: string;
}

/**
 * The minimum of a clipboard event this hook touches.
 *
 * Structural rather than `React.ClipboardEvent` so a host can call it from a
 * native listener, a synthetic one, or a test double. React's own event satisfies
 * it.
 */
export interface PasteEventLike {
  clipboardData?: { getData(type: string): string } | null;
  preventDefault(): void;
}

export interface UsePastePillsOptions {
  /**
   * Hold a paste of at least this many characters. Try 500 — about a long
   * paragraph.
   *
   * **No default, on purpose.** Paste is a fundamental interaction, so holding one
   * is something a host asks for rather than something it discovers. Omit this and
   * `handlePaste` always returns `false` and touches nothing.
   */
  threshold?: number;
  /** Own the list yourself. Omit to let the hook keep it. */
  heldPastes?: HeldPaste[];
  onHeldPastesChange?: (pastes: HeldPaste[]) => void;
}

export interface UsePastePillsResult {
  heldPastes: HeldPaste[];
  /**
   * Call this from your OWN paste handler. Returns `true` if it took the paste —
   * in which case it has already called `preventDefault()` — and `false` if it
   * declined, having touched nothing.
   *
   * Composable on purpose: a host whose handler already intercepts paste for its
   * own reasons needs to ask "did you want this?" rather than hand over the event.
   *
   *     function onPaste(e) {
   *       if (pills.handlePaste(e)) return;
   *       // ...your own handling
   *     }
   */
  handlePaste: (event: PasteEventLike) => boolean;
  /**
   * Removes the paste and returns its text, for the host to insert into its own
   * surface. `undefined` if there is no such id.
   *
   * The hook cannot insert it — it owns no DOM and does not know what a host's
   * surface is. That is the point.
   */
  expand: (id: string) => string | undefined;
  /** Discard one without returning it. */
  remove: (id: string) => void;
  /** Empty the list, e.g. after a send. */
  clear: () => void;
}

/**
 * Hold a large paste as state, so a composer can show it as a pill instead of
 * turning itself into a scrolling wall.
 *
 * ---------------------------------------------------------------------------
 * Why this is a hook and not just a feature of `Composer`
 * ---------------------------------------------------------------------------
 *
 * `Composer` shipped the behaviour in 5.31.0 and the MOIC estate, who specified it,
 * then established something I had missed: their chat input is a contenteditable
 * rendering inline `[deal:42|Acme]` badges, so they **cannot** adopt `Composer` (a
 * plain textarea) however much they want its behaviour. Their plan to delete their
 * own composer when ours landed could never have worked.
 *
 * So the logic lives here and **`Composer` is its first caller.** One
 * implementation rather than two, which matters more than the convenience: two
 * copies of a rule drift, and the copy nobody reads is the one that rots. The rule
 * that must not drift is the one in `Composer`'s own tests — a send with pills
 * still closed carries the text.
 *
 * It owns no DOM. The host renders the pills.
 *
 * ---------------------------------------------------------------------------
 * Who actually calls this (as of 5.32.0): `Composer`, and nothing else
 * ---------------------------------------------------------------------------
 *
 * The estate that specified it **withdrew before adopting it**, hours after it
 * shipped — their design moved the pill INTO the message as a `[paste:id|label]`
 * marker in the same grammar as their other object tags, which makes the message
 * itself the record of what is attached. A parallel `heldPastes` array would then be
 * a second place answering "what am I sending?", and the two would disagree the
 * moment someone backspaced a badge. Their reasoning was better than the spec.
 *
 * Recorded because a reader should not infer an extension point under active
 * external use. It is kept rather than withdrawn for two reasons that are about
 * cost, not optimism: it is published API on a 5.x package, so removing it needs a
 * major; and `Composer` calls it, so it is exercised by that component's tests on
 * every run and cannot rot unnoticed.
 *
 * **It gets no further surface without a real caller.** No extra options, no second
 * hook. An API with one hypothetical consumer is how a package accumulates surface
 * nobody uses.
 */
export function usePastePills({
  threshold,
  heldPastes: controlledHeldPastes,
  onHeldPastesChange,
}: UsePastePillsOptions = {}): UsePastePillsResult {
  const [heldPastes, setHeldPastes] = useControllableState<HeldPaste[]>(
    controlledHeldPastes,
    [],
    onHeldPastesChange,
  );

  /*
   * A counter rather than `crypto.randomUUID()` or an index.
   *
   * An index is not an id — removing the first pill renumbers the rest, and a host
   * keying its DOM on that remounts every pill and loses hover state. A counter in
   * a ref is stable for the life of the component and needs no platform API that a
   * server renderer might lack.
   */
  const nextId = useRef(0);

  const handlePaste = useCallback(
    (event: PasteEventLike): boolean => {
      if (!threshold || threshold <= 0) return false;

      const text = event.clipboardData?.getData("text/plain") ?? "";

      // Below the threshold, decline WITHOUT touching the event. A host calling
      // this from inside its own handler has to be able to carry on as if the hook
      // were not there.
      if (text.length < threshold) return false;

      event.preventDefault();
      nextId.current += 1;
      const id = `paste-${nextId.current}`;
      setHeldPastes((current) => [...current, { id, text }]);

      return true;
    },
    [threshold, setHeldPastes],
  );

  const expand = useCallback(
    (id: string): string | undefined => {
      const found = heldPastes.find((p) => p.id === id);

      if (found === undefined) return undefined;

      setHeldPastes((current) => current.filter((p) => p.id !== id));

      return found.text;
    },
    [heldPastes, setHeldPastes],
  );

  const remove = useCallback(
    (id: string) => setHeldPastes((current) => current.filter((p) => p.id !== id)),
    [setHeldPastes],
  );

  const clear = useCallback(() => setHeldPastes([]), [setHeldPastes]);

  return { heldPastes, handlePaste, expand, remove, clear };
}
