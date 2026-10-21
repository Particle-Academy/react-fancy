import type { Ref, RefCallback } from "react";

/**
 * One ref callback that feeds every ref it is given.
 *
 * For a component that needs its own handle on an element AND has to honour a
 * ref someone else put there — a Tooltip anchoring to its trigger, a control
 * measuring itself while a caller holds a ref to it. Assigning one ref over the
 * other silently breaks whichever side lost.
 */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined | null>): RefCallback<T> {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}
