import { useCallback, useEffect, useState, type RefObject } from "react";
import type { Placement } from "../utils/types";
import { directionOf, type Direction } from "../utils/direction";

interface FloatingPosition {
  x: number;
  y: number;
  placement: Placement;
  /**
   * The anchor's writing direction. Put it on the floating element as `dir`:
   * a floating element is portalled to `<body>`, so without it a `dir` set on
   * a wrapper (rather than on `<html>`) would not reach the popup.
   */
  dir: Direction;
}

interface UseFloatingPositionOptions {
  placement?: Placement;
  offset?: number;
  enabled?: boolean;
}

function getPosition(
  anchor: DOMRect,
  floating: DOMRect,
  placement: Placement,
  offset: number,
  dir: Direction = "ltr",
): FloatingPosition {
  let x = 0;
  let y = 0;
  const base = placement.split("-")[0] as "top" | "bottom" | "left" | "right";
  const align = placement.split("-")[1] as "start" | "end" | undefined;

  switch (base) {
    case "top":
      x = anchor.left + anchor.width / 2 - floating.width / 2;
      y = anchor.top - floating.height - offset;
      break;
    case "bottom":
      x = anchor.left + anchor.width / 2 - floating.width / 2;
      y = anchor.bottom + offset;
      break;
    case "left":
      x = anchor.left - floating.width - offset;
      y = anchor.top + anchor.height / 2 - floating.height / 2;
      break;
    case "right":
      x = anchor.right + offset;
      y = anchor.top + anchor.height / 2 - floating.height / 2;
      break;
  }

  // `start` / `end` are LOGICAL: `bottom-start` lines the popup up with the
  // anchor's inline-start edge, which is its RIGHT edge in RTL. The base side
  // (`left` / `right`) stays physical, as the names say.
  if (base === "top" || base === "bottom") {
    const startEdge = dir === "rtl" ? anchor.right - floating.width : anchor.left;
    const endEdge = dir === "rtl" ? anchor.left : anchor.right - floating.width;
    if (align === "start") x = startEdge;
    else if (align === "end") x = endEdge;
  }

  if (base === "left" || base === "right") {
    if (align === "start") y = anchor.top;
    else if (align === "end") y = anchor.bottom - floating.height;
  }

  // Viewport clamping
  let finalPlacement = placement;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (base === "bottom" && y + floating.height > vh) {
    y = anchor.top - floating.height - offset;
    finalPlacement = placement.replace("bottom", "top") as Placement;
  } else if (base === "top" && y < 0) {
    y = anchor.bottom + offset;
    finalPlacement = placement.replace("top", "bottom") as Placement;
  }

  x = Math.max(4, Math.min(x, vw - floating.width - 4));
  y = Math.max(4, Math.min(y, vh - floating.height - 4));

  return { x, y, placement: finalPlacement, dir };
}

export function useFloatingPosition(
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  options: UseFloatingPositionOptions = {},
): FloatingPosition {
  const { placement = "bottom", offset = 8, enabled = true } = options;
  const [position, setPosition] = useState<FloatingPosition>({
    x: -9999,
    y: -9999,
    placement,
    dir: "ltr",
  });

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const floating = floatingRef.current;
    if (!anchor || !floating) return;

    const anchorRect = anchor.getBoundingClientRect();
    // The popup's SIZE comes from layout, not from its transformed box: popups
    // open with `fancy-scale-in` (scale 0.95 to 1) and are measured during it, so
    // the box is 5% small, and nothing re-measures when the animation ends. That
    // left an RTL `bottom-start` (and an LTR `bottom-end`) popup off the anchor's
    // edge for good. Layout size is 0 where nothing lays out (jsdom), so the box
    // is the fallback.
    const box = floating.getBoundingClientRect();
    const floatingRect = {
      width: floating.offsetWidth || box.width,
      height: floating.offsetHeight || box.height,
    } as DOMRect;
    const next = getPosition(anchorRect, floatingRect, placement, offset, directionOf(anchor));
    // Bail out when nothing changed so this can run after every commit
    // (below) without causing an infinite render loop.
    setPosition((prev) =>
      prev.x === next.x && prev.y === next.y && prev.placement === next.placement && prev.dir === next.dir
        ? prev
        : next,
    );
  }, [anchorRef, floatingRef, placement, offset]);

  // Re-measure after every commit while open.
  //
  // The floating element mounts a frame or two AFTER `enabled` flips — its
  // render is gated behind a state flip (e.g. useAnimation's `mounted`), so at
  // the moment `enabled` turns true the floating ref is still null and a single
  // measurement no-ops, leaving the popover parked at its off-screen sentinel.
  //
  // A passive effect with no deps runs after *every* commit — including the one
  // that finally mounts the floating element — and, crucially, keeps running in
  // hidden/background tabs where `requestAnimationFrame` is paused. The bail-out
  // in `update` makes the steady-state calls free, so this both fixes the
  // late-mount race and survives tab-visibility throttling.
  useEffect(() => {
    if (enabled) update();
  });

  // …but the per-commit effect ISN'T enough when the floating element mounts
  // through a <Portal> whose own mount gate (SSR-safe; renders nothing until its
  // useEffect runs) attaches the node WITHOUT re-rendering this hook's component.
  // Then no commit happens here, the measurement never runs, and the popover
  // stays parked at its off-screen sentinel until an unrelated scroll/resize
  // fires `update()` — the "menu only appears after I scroll" bug. Poll with rAF
  // until the node is actually in the DOM, measure it, then keep it observed for
  // size changes (async content / lazily-loaded icons).
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    const tick = () => {
      const el = floatingRef.current;
      if (el) {
        update();
        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(() => update());
          ro.observe(el);
        }
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [enabled, update, floatingRef]);

  // Park off-screen when closed so the next open re-measures from scratch.
  useEffect(() => {
    if (!enabled) {
      setPosition((prev) =>
        prev.x === -9999 ? prev : { x: -9999, y: -9999, placement, dir: prev.dir },
      );
    }
  }, [enabled, placement]);

  // Reposition on scroll/resize while open.
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [update, enabled]);

  return position;
}
