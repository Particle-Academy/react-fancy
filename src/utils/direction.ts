/**
 * Writing direction, read from the DOM rather than passed as a prop.
 *
 * Components follow the `dir` the browser already resolved for them, inherited
 * from the nearest ancestor that sets one (usually `<html dir="rtl">`). Reading
 * the computed `direction` means a `dir` on any wrapper works, with nothing to
 * thread through props or context, and SSR renders the same markup for both
 * directions: layout is logical CSS, and only code that measures or maps keys
 * asks this question, always in an effect or an event handler.
 */
export type Direction = "ltr" | "rtl";

export function directionOf(el: Element | null | undefined): Direction {
  if (!el || typeof window === "undefined" || typeof getComputedStyle !== "function") return "ltr";
  return getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr";
}

export function isRtl(el: Element | null | undefined): boolean {
  return directionOf(el) === "rtl";
}

/**
 * The LOGICAL step a horizontal arrow key means: +1 toward the inline end
 * ("next"), -1 toward the inline start ("previous"), 0 for any other key.
 *
 * ArrowRight moves visually right in both directions, and visually right is
 * the inline END in LTR but the inline START in RTL.
 */
export function inlineStep(key: string, el: Element | null | undefined): -1 | 0 | 1 {
  if (key !== "ArrowRight" && key !== "ArrowLeft") return 0;
  const forward = key === "ArrowRight" ? 1 : -1;
  return (isRtl(el) ? -forward : forward) as -1 | 1;
}
