import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Moves focus into `ref`, keeps Tab inside it, and restores focus on disable.
 *
 * `ref.current` must already be set in the commit where `enabled` turns true:
 * the effect does not run again until `enabled` changes. A panel that mounts
 * later (an animation, a Portal) should key `enabled` on the node — see
 * `useDialogFocusTrap`.
 *
 * `restoreTo`, when it holds an element, is where focus returns on disable
 * instead of whatever was focused when the trap engaged.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean = true,
  restoreTo?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Tab stops only. `button` / `input` match an element with `tabindex="-1"`
    // too (Command's options), and treating one as the last stop meant Tab never
    // wrapped: focus was never ON it, so the browser walked out of the dialog.
    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (node) => node.getAttribute("tabindex") !== "-1",
      );

    // Focus first focusable element
    const first = focusables()[0];
    first?.focus();

    const listener = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        }
      } else {
        if (document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };

    el.addEventListener("keydown", listener);

    return () => {
      el.removeEventListener("keydown", listener);
      (restoreTo?.current ?? previouslyFocused)?.focus();
    };
  }, [ref, enabled, restoreTo]);
}
