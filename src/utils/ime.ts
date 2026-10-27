type KeyLike = Pick<KeyboardEvent, "isComposing" | "keyCode">;

/**
 * True while this keydown belongs to an IME composition.
 *
 * A Japanese, Chinese or Korean typist presses Enter to ACCEPT the candidate
 * they are composing. A field that sends, adds or picks on Enter must ignore
 * that keypress, or the person who meant to finish a word sends half a
 * sentence instead.
 *
 * `isComposing` is the standard signal. Safari fires the confirming keydown
 * after `compositionend`, with `isComposing` already false but `keyCode` 229,
 * and older engines only ever set the keyCode, so both are read.
 *
 * Takes a native `KeyboardEvent` or a React synthetic one (via `nativeEvent`).
 */
export function isImeComposing(event: KeyLike | { nativeEvent: KeyLike }): boolean {
  const e = "nativeEvent" in event ? event.nativeEvent : event;
  return e.isComposing === true || e.keyCode === 229;
}
