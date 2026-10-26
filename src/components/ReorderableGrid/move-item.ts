export interface MoveItemOptions<T> {
  /**
   * Pinned entries. A locked entry keeps its absolute index: it cannot be
   * moved, nothing can be dropped onto its slot, and the other entries flow
   * around it. Either the locked ids themselves or a predicate.
   */
  locked?: Iterable<T> | ((id: T) => boolean);
}

function lockPredicate<T>(locked: MoveItemOptions<T>["locked"]): ((id: T) => boolean) | null {
  if (!locked) return null;
  if (typeof locked === "function") return locked;
  const set = new Set(locked);
  return set.size ? (id: T) => set.has(id) : null;
}

/**
 * Move the entry at `fromIndex` so that it ends up at `toIndex`, row-major,
 * and return a NEW array. The input is never mutated.
 *
 * This is the whole reorder rule of `ReorderableGrid`, with no DOM: the grid's
 * pointer drags and arrow keys both go through it, and an agent bridge can call
 * it directly to reorder from a tool call.
 *
 * - `toIndex` is the entry's index in the RESULT, so `moveItem(ids, 0, ids.length - 1)`
 *   moves the first entry to the end.
 * - An index outside the list (or not an integer) throws `RangeError`. That is
 *   a caller bug, and a silent no-op would hide it.
 * - With `locked`: a locked entry keeps its absolute index and the move happens
 *   among the free slots only. Moving a locked entry, or onto a locked slot,
 *   returns the order unchanged: that is the rule doing its job, not an error.
 */
export function moveItem<T>(
  ids: readonly T[],
  fromIndex: number,
  toIndex: number,
  options: MoveItemOptions<T> = {},
): T[] {
  const n = ids.length;
  for (const [name, i] of [
    ["fromIndex", fromIndex],
    ["toIndex", toIndex],
  ] as const) {
    if (!Number.isInteger(i) || i < 0 || i >= n) {
      throw new RangeError(`moveItem: ${name} ${i} is outside 0..${n - 1}`);
    }
  }

  const out = ids.slice();
  if (fromIndex === toIndex) return out;

  const isLocked = lockPredicate(options.locked);
  if (!isLocked) {
    const [moved] = out.splice(fromIndex, 1);
    out.splice(toIndex, 0, moved as T);
    return out;
  }

  if (isLocked(ids[fromIndex] as T) || isLocked(ids[toIndex] as T)) return out;

  // Move within the free slots only; locked entries never leave theirs.
  const slots: number[] = [];
  for (let i = 0; i < n; i++) if (!isLocked(ids[i] as T)) slots.push(i);
  const free = slots.map((i) => ids[i] as T);
  const [moved] = free.splice(slots.indexOf(fromIndex), 1);
  free.splice(slots.indexOf(toIndex), 0, moved as T);
  slots.forEach((slot, k) => {
    out[slot] = free[k] as T;
  });
  return out;
}
