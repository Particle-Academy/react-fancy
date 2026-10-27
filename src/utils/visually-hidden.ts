import type { CSSProperties } from "react";

/**
 * The standard sr-only clip pattern as an inline style: the same declarations
 * Tailwind's `sr-only` utility emits. Pair it with `className="sr-only"`.
 *
 * Inline because a visually hidden element must not depend on the host's
 * Tailwind build having generated `sr-only` for react-fancy's classes. Without
 * it the element renders as visible, unclipped text (genie#1290).
 *
 * The element is `position: absolute`, so whatever holds it must be positioned
 * too. Otherwise it escapes to the nearest positioned ancestor, which can sit
 * outside an unpositioned scroll container and stretch the document.
 */
export const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
