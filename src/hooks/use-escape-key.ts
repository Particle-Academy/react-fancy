import { useEffect } from "react";

export function useEscapeKey(
  handler: () => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handler();
      }
    };

    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [handler, enabled]);
}
