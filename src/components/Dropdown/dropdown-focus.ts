/** Enabled menu items, in DOM order. Disabled items are skipped. */
export function menuItems(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return [];
  return Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]):not([disabled])'),
  );
}

export type FocusMove = "first" | "last" | "next" | "prev";

/**
 * Focus an item relative to the one that currently has focus, wrapping at both
 * ends. Returns the index focused, or -1 when the menu has no enabled item.
 */
export function focusMenuItem(menu: HTMLElement | null, move: FocusMove): number {
  const items = menuItems(menu);
  if (items.length === 0) return -1;
  const current = items.indexOf(document.activeElement as HTMLElement);
  let next: number;
  if (move === "first") next = 0;
  else if (move === "last") next = items.length - 1;
  else if (current === -1) next = move === "next" ? 0 : items.length - 1;
  else next = (current + (move === "next" ? 1 : -1) + items.length) % items.length;
  items[next]!.focus();
  return next;
}

/**
 * Typeahead: focus the next enabled item (after the focused one, wrapping)
 * whose text starts with `char`. Returns the index focused, or -1 for no match.
 */
export function focusByChar(menu: HTMLElement | null, char: string): number {
  const items = menuItems(menu);
  if (items.length === 0) return -1;
  const needle = char.toLowerCase();
  const start = items.indexOf(document.activeElement as HTMLElement);
  for (let step = 1; step <= items.length; step++) {
    const i = (start + step + items.length) % items.length;
    if ((items[i]!.textContent ?? "").trim().toLowerCase().startsWith(needle)) {
      items[i]!.focus();
      return i;
    }
  }
  return -1;
}
