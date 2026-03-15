import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";
import type { Placement } from "../utils/types";

interface FloatingPosition {
  x: number;
  y: number;
  placement: Placement;
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

  if (base === "top" || base === "bottom") {
    if (align === "start") x = anchor.left;
    else if (align === "end") x = anchor.right - floating.width;
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

  return { x, y, placement: finalPlacement };
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
  });

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const floating = floatingRef.current;
    if (!anchor || !floating) return;

    const anchorRect = anchor.getBoundingClientRect();
    const floatingRect = floating.getBoundingClientRect();
    setPosition(getPosition(anchorRect, floatingRect, placement, offset));
  }, [anchorRef, floatingRef, placement, offset]);

  // Use layoutEffect + rAF to ensure the floating element has been painted
  // and has real dimensions before we measure it
  useLayoutEffect(() => {
    if (!enabled) return;

    // First attempt right away (works if element already has dimensions)
    update();

    // Second attempt after browser paint (handles first-render case)
    const raf = requestAnimationFrame(() => {
      update();
    });

    return () => cancelAnimationFrame(raf);
  }, [update, enabled]);

  // Scroll/resize listeners in a regular effect
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
