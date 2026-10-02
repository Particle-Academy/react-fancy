import { useCallback, useRef, useState } from "react";

/**
 * One state slot that works controlled or uncontrolled.
 *
 * ---------------------------------------------------------------------------
 * Why the value is tracked in a ref (fixed 5.32.0)
 * ---------------------------------------------------------------------------
 *
 * This resolved a functional update against the RENDER CLOSURE's `value` and then
 * handed React an already-computed value:
 *
 *     const nextValue = typeof next === "function" ? next(value) : next;
 *     setUncontrolledValue(nextValue);
 *
 * So `setValue(fn)` twice in one batch had both calls compute from the same stale
 * `value`, and **the first update was silently lost.** React's own `setState`
 * updater form does not have that problem precisely because React resolves it
 * against the latest state; passing a pre-computed value gives that up.
 *
 * Found by a hook test that paste-held two items inside one `act()` and got one.
 * It is not an exotic case — any caller that loops, or handles two events in a
 * batch, hits it, and the symptom is a dropped update with nothing to indicate one
 * happened.
 *
 * The fix cannot be "pass the updater to React", because `onChange` has to be
 * called with the resulting value and an updater must stay pure — React may invoke
 * it twice (StrictMode), which would fire `onChange` twice. So the previous value
 * comes from a ref that is re-synced from the authoritative `value` on every render
 * and advanced on every set. Within a batch the ref carries intent; after a render
 * the real value wins.
 *
 * A side effect worth having: `setValue` no longer depends on `value`, so it is
 * stable for the life of the component.
 */
export function useControllableState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Re-synced every render from whichever side owns the value. A controlled parent
  // that ignores `onChange` therefore wins on the next render rather than being
  // overridden by what this hook optimistically recorded.
  const valueRef = useRef(value);
  valueRef.current = value;

  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const nextValue =
      typeof next === "function"
        ? (next as (prev: T) => T)(valueRef.current)
        : next;

    // Advance the ref BEFORE notifying, so a second call in the same batch builds
    // on this one instead of on what the last render saw.
    valueRef.current = nextValue;

    if (!isControlledRef.current) {
      setUncontrolledValue(nextValue);
    }

    onChangeRef.current?.(nextValue);
  }, []);

  return [value, setValue];
}
