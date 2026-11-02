import { useSyncExternalStore } from "react";

// ── Dark-mode detection ────────────────────────────────────────────────────
// The highlight palette is baked in as inline colors, so we resolve light/dark
// ourselves. Follow BOTH signals so we match whatever drives the surrounding
// `dark:` Tailwind variants: the `.dark` class (class strategy) OR the
// prefers-color-scheme media query (media strategy). Shared by CodeView and
// CodeBlock so the two always agree on the palette.

// `matchMedia` is optional: jsdom (and so a consumer's component tests) has
// none, and a missing media API must cost the media signal, not the render.
function darkQuery(): MediaQueryList | null {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
}

function subscribeDark(callback: () => void): () => void {
  const mq = darkQuery();
  mq?.addEventListener?.("change", callback);
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => {
    mq?.removeEventListener?.("change", callback);
    observer.disconnect();
  };
}

function darkSnapshot(): boolean {
  return document.documentElement.classList.contains("dark") || (darkQuery()?.matches ?? false);
}

/** Light on the server (and during hydration), then the real theme. */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribeDark, darkSnapshot, () => false);
}
