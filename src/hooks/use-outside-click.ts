import { useEffect, type RefObject } from "react";

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler(event);
    };

    // Defer listener registration so the opening click event doesn't
    // immediately trigger an outside-click close on the same frame.
    const raf = requestAnimationFrame(() => {
      document.addEventListener("mousedown", listener);
      document.addEventListener("touchstart", listener);
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, enabled]);
}
