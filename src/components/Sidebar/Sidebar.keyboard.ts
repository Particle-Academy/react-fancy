import { useCallback, useEffect, type KeyboardEvent, type RefObject } from "react";

/**
 * What arrow keys move between: every `Sidebar.Item`, plus an EXPANDED
 * `Sidebar.Submenu`'s trigger button. (A collapsed submenu renders a plain
 * `<div>`, which is not focusable, so there is nothing to move to.)
 *
 * Selected by the handles the components already render, so `keyboardNav`
 * adds no markup to a Sidebar that does not use it.
 */
const ITEM_SELECTOR =
  "[data-react-fancy-sidebar-item], [data-react-fancy-sidebar-submenu] > button";

const NAV_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

/**
 * Inside a closed submenu — the panel is collapsed to zero height but its
 * items are still mounted, so without this they would be focusable while
 * invisible. `SidebarSubmenu` sets `aria-expanded` on its trigger only when
 * `keyboardNav` is on; a submenu's OWN trigger is not inside its panel.
 */
function inClosedSubmenu(el: HTMLElement, root: HTMLElement): boolean {
  let sub = el.parentElement?.closest<HTMLElement>("[data-react-fancy-sidebar-submenu]");
  while (sub && root.contains(sub)) {
    const trigger = sub.querySelector<HTMLElement>(":scope > button");
    if (trigger && trigger !== el && trigger.getAttribute("aria-expanded") === "false") {
      return true;
    }
    sub = sub.parentElement?.closest<HTMLElement>("[data-react-fancy-sidebar-submenu]");
  }
  return false;
}

function isNavigable(el: HTMLElement, root: HTMLElement): boolean {
  if (el.getAttribute("aria-disabled") === "true") return false;
  if ((el as HTMLButtonElement).disabled) return false;
  return !inClosedSubmenu(el, root);
}

function allItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

/**
 * Roving tabindex + ArrowUp / ArrowDown / Home / End for `Sidebar keyboardNav`.
 *
 * The tab stop is kept on the DOM rather than in React state because items
 * can mount from anywhere below the root (a consumer's own component, a
 * submenu opening) without the root re-rendering. A MutationObserver re-applies
 * it when the set of items, or their disabled / expanded / current state,
 * changes; focus moving onto an item (by click, Tab or arrow) makes that item
 * the stop. Turning `keyboardNav` off removes every tabindex it set.
 *
 * React never renders a `tabIndex` on these items itself, so writing the
 * attribute does not fight reconciliation. (A consumer who passes `tabIndex`
 * to an item while `keyboardNav` is on is overriding the roving stop, and
 * React will reassert theirs on its next render of that item.)
 */
export function useSidebarKeyboardNav(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): ((event: KeyboardEvent<HTMLElement>) => void) | undefined {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;

    const touched = new Set<HTMLElement>();
    let current: HTMLElement | null = null;

    const apply = () => {
      const items = allItems(root);
      const navigable = items.filter((el) => isNavigable(el, root));
      if (!current || !navigable.includes(current)) {
        current =
          navigable.find((el) => el.getAttribute("aria-current") === "page") ??
          navigable[0] ??
          null;
      }
      for (const el of items) {
        const want = el === current ? "0" : "-1";
        if (el.getAttribute("tabindex") !== want) el.setAttribute("tabindex", want);
        touched.add(el);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.matches(ITEM_SELECTOR) || !root.contains(target)) return;
      if (!isNavigable(target, root)) return;
      current = target;
      apply();
    };

    apply();
    root.addEventListener("focusin", onFocusIn);
    const observer = new MutationObserver(apply);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      // NOT tabindex: that is what `apply` writes.
      attributeFilter: ["aria-disabled", "aria-expanded", "aria-current", "disabled"],
    });

    return () => {
      observer.disconnect();
      root.removeEventListener("focusin", onFocusIn);
      for (const el of touched) el.removeAttribute("tabindex");
    };
  }, [rootRef, enabled]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const root = rootRef.current;
      if (!root || !NAV_KEYS.has(event.key)) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      // Only when an ITEM has focus. An input, textarea, select or
      // contenteditable inside the sidebar (a filter box, say) keeps its keys:
      // it does not match the item selector, so it never gets here.
      const target = event.target as HTMLElement;
      if (!target.matches(ITEM_SELECTOR)) return;

      const items = allItems(root);
      const navigable = items.filter((el) => isNavigable(el, root));
      if (navigable.length === 0) return;

      let next: HTMLElement | undefined;
      if (event.key === "Home") next = navigable[0];
      else if (event.key === "End") next = navigable[navigable.length - 1];
      else {
        // Walk from the target's position among ALL items, so a focused item
        // that is itself not navigable (disabled while focused) still moves.
        const from = items.indexOf(target);
        const step = event.key === "ArrowDown" ? 1 : -1;
        for (let i = from + step; i >= 0 && i < items.length; i += step) {
          if (navigable.includes(items[i])) {
            next = items[i];
            break;
          }
        }
      }

      // Handled either way: an arrow at the end of the list must not scroll
      // the page instead. No wrap, matching a list rather than a menu.
      event.preventDefault();
      next?.focus();
    },
    [rootRef],
  );

  return enabled ? onKeyDown : undefined;
}
