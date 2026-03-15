import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

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
      previouslyFocused?.focus();
    };
  }, [ref, enabled]);
}
