/**
 * Reference-counted body scroll lock.
 *
 * Two surfaces locking independently with the save-and-restore pattern
 * (`const original = body.style.overflow`) only unwind correctly in strict LIFO
 * order. Exit them out of order and the first one out restores `""` while the
 * second is still covering the viewport, so the page scrolls behind it. Counting
 * holders keeps the lock until the last one lets go, and restores the value that
 * was there before the FIRST took it.
 *
 * Call only from an effect: it touches `document`.
 */
let holders = 0;
let saved = "";

export function lockBodyScroll(): () => void {
  if (holders === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  holders++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders--;
    if (holders === 0) document.body.style.overflow = saved;
  };
}
