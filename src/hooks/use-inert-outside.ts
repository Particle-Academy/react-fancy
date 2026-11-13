import { useEffect } from "react";

/**
 * How many open dialogs have made each element inert, and whether it was inert
 * before the first of them. Shared, so stacked dialogs (a Drawer over a Modal)
 * neither restore an element another dialog still needs inert, nor un-inert one
 * the host made inert itself.
 */
const holds = new WeakMap<Element, { count: number; wasInert: boolean }>();

function hold(el: Element) {
  const entry = holds.get(el);
  if (entry) {
    entry.count += 1;
    return;
  }
  holds.set(el, { count: 1, wasInert: el.hasAttribute("inert") });
  el.setAttribute("inert", "");
}

function release(el: Element) {
  const entry = holds.get(el);
  if (!entry) return;
  entry.count -= 1;
  if (entry.count > 0) return;
  holds.delete(el);
  if (!entry.wasInert) el.removeAttribute("inert");
}

/**
 * While `active`, make every element outside `node`'s ancestor chain `inert`:
 * at each level from `node` up to `<body>`, every sibling. Restored when
 * `active` turns off, `node` changes, or the component unmounts.
 *
 * Walking the chain, rather than assuming `node` is a child of `<body>`, is what
 * makes it work when the dialog is portalled into a landmark (`<main>`) through
 * `PortalContainerContext`: the landmark stays live, its other children and the
 * landmark's own siblings do not.
 *
 * `aria-modal` alone only asks assistive tech to ignore the rest of the page,
 * and not every screen reader does; a pointer and a virtual cursor could still
 * reach it. `inert` removes it from both. Elements added after the dialog opens
 * (a popup opened from inside it) are not touched.
 */
export function useInertOutside(node: HTMLElement | null, active: boolean): void {
  useEffect(() => {
    if (!active || !node || typeof document === "undefined") return;
    const held: Element[] = [];
    for (let el: Element = node; el.parentElement && el !== document.body; el = el.parentElement) {
      for (const sibling of Array.from(el.parentElement.children)) {
        if (sibling === el) continue;
        hold(sibling);
        held.push(sibling);
      }
    }
    return () => held.forEach(release);
  }, [node, active]);
}
