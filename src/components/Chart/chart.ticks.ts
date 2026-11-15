import { useEffect, useState, type RefObject } from "react";

/**
 * Which category labels the x-axis draws. A number shows every Nth label
 * (`1` = all of them); `"auto"` thins them so no two drawn labels overlap.
 */
export type ChartXLabelInterval = number | "auto";

/**
 * How a category label is drawn as a tick. Changes the TICK only: the bar key,
 * the tooltip heading and the screen-reader list keep the full label.
 * `"date-short"` draws a date as `MM-DD`.
 */
export type ChartXTickFormat = ((label: string, index: number) => string) | "date-short";

/** Space kept clear between two drawn labels, in px. */
const LABEL_GAP = 6;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;

/** `MM-DD` for a date label; anything that is not a date comes back unchanged. */
export function dateShort(label: string): string {
  // A date-only ISO string is read as written: `new Date("2026-10-01")` is UTC
  // midnight, which is the previous day in any timezone west of Greenwich.
  const iso = ISO_DATE.exec(label);
  if (iso) return `${iso[2]}-${iso[3]}`;
  const t = Date.parse(label);
  if (Number.isNaN(t)) return label;
  const d = new Date(t);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatXTick(label: string, index: number, format: ChartXTickFormat | undefined): string {
  if (format === undefined) return label;
  if (format === "date-short") return dateShort(label);
  return format(label, index);
}

/**
 * Estimated width of a label in px. An estimate rather than a measurement, so
 * the server and the browser draw the same ticks (no hydration mismatch, and
 * the same result with no layout, as in jsdom). It errs wide: 0.62em for a
 * Latin character, 1em for CJK and other full-width characters.
 */
export function estimateLabelWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    em += cp >= 0x2e80 ? 1 : 0.62;
  }
  return em * fontSize;
}

/**
 * The step between drawn labels: 1 draws every label. `slot` is the distance
 * between the centres of two neighbouring categories, in px.
 */
export function xLabelStep(
  ticks: readonly string[],
  slot: number | null,
  interval: ChartXLabelInterval | undefined,
  fontSize: number,
): number {
  if (typeof interval === "number") {
    return Number.isFinite(interval) && interval >= 1 ? Math.floor(interval) : 1;
  }
  // Nothing to measure against (one category, or not laid out yet): draw all.
  if (ticks.length < 2 || slot === null || !(slot > 0)) return 1;
  const widest = Math.max(...ticks.map((t) => estimateLabelWidth(t, fontSize)));
  return Math.max(1, Math.ceil((widest + LABEL_GAP) / slot));
}

/** The indexes of the labels the axis draws, always starting with the first. */
export function visibleXTickIndexes(count: number, step: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i += step) out.push(i);
  return out;
}

/**
 * The element's width in px once mounted, tracked with a ResizeObserver;
 * `null` on the server and before the first measurement.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setWidth(w > 0 ? w : null);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
