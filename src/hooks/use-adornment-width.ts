import { useCallback, useEffect, useState } from "react";

/**
 * Measure an inline adornment so the input can reserve exactly its width.
 *
 * ## Why this exists
 *
 * `leading` / `trailing` render ABSOLUTELY over the input, so they take no
 * space in flow and the input must be padded by hand to keep text clear of
 * them. That padding used to be a fixed `pl-9` / `pr-9` — 36px, sized for a
 * single icon. Any wider adornment ran straight under the value: `leading =
 * "https://"` is roughly 50px, so `https://` and `fancy.app` rendered on top of
 * one another.
 *
 * A fixed padding cannot be right for arbitrary content, and these props accept
 * arbitrary content — a currency code, a unit, a protocol, a short label. So
 * the width is measured rather than assumed.
 *
 * Returns `0` until measured (and on the server), which is the signal to keep
 * the old fixed padding as a fallback: an unmeasured render is then no worse
 * than it was before, rather than unpadded.
 *
 * `ResizeObserver` rather than a one-shot read, because the width changes after
 * first paint for reasons the first paint cannot see — a webfont swapping in,
 * the adornment's own content changing, a container query resizing the text.
 */
export function useAdornmentWidth(): [(node: HTMLElement | null) => void, number] {
  const [width, setWidth] = useState(0);
  const [node, setNode] = useState<HTMLElement | null>(null);

  const ref = useCallback((n: HTMLElement | null) => setNode(n), []);

  useEffect(() => {
    if (!node) {
      setWidth(0);

      return;
    }

    const read = () => setWidth(node.getBoundingClientRect().width);
    read();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(read);
    observer.observe(node);

    return () => observer.disconnect();
  }, [node]);

  return [ref, width];
}
