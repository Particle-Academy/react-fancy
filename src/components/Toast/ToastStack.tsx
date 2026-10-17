import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Portal } from "../Portal";
import { Badge } from "../Badge";
import type { ToastPosition } from "./Toast.types";

export interface ToastStackProps<T> {
  /**
   * Everything to show — the stack is a VIEW of this list and owns none of it.
   * There is no limit and no timer: an item leaves only when you remove it.
   */
  items: readonly T[];
  /** One card's content, actions included. Only the front card is interactive. */
  renderItem: (item: T, state: { index: number; isFront: boolean }) => ReactNode;
  /** A stable key per item. Defaults to `item.id`, then the index. */
  getKey?: (item: T, index: number) => string;
  /** How many cards show behind the front one. Default 2. */
  depth?: number;
  /** How far each card behind peeks out above the one in front, in px. Default 8. */
  offset?: number;
  /** How much smaller each card behind is than the one in front. Default 0.05. */
  scaleStep?: number;
  /** Which item is in front, if you want to own it. Wraps; out-of-range values are clamped. */
  frontIndex?: number;
  defaultFrontIndex?: number;
  onFrontIndexChange?: (index: number) => void;
  /** A screen corner, or `"inline"` to render where it is placed. Default `"bottom-right"`. */
  position?: ToastPosition | "inline";
  /** The stack's accessible name. Default "Notifications". */
  label?: string;
  /** Classes for each card's shell, merged onto the defaults. */
  cardClassName?: string;
  className?: string;
}

const POSITION_STYLES: Record<ToastPosition, string> = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
};

/** Pixels of wheel travel that count as one step. A mouse notch is ~100; a trackpad sends many small ones. */
const WHEEL_STEP = 50;

const CARD =
  "rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900";

function defaultKey(item: unknown, index: number): string {
  const id = (item as { id?: unknown } | null)?.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : String(index);
}

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.getAttribute("contenteditable") === "true" ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
  );
}

/**
 * A controlled stack of actionable toasts — approval requests, say — that the
 * person walks through rather than races.
 *
 * Built for react-fancy#33. The owner's requirements were that requests stack
 * behind each other with a slight top offset, that scrolling over the stack
 * walks through them, and that a pending request NEVER expires or disappears.
 * The last is why this is a view of the caller's list rather than a queue it
 * keeps: there is nothing here that can drop an item, because nothing here owns
 * one. (The imperative provider's `maxToasts` silently drops the oldest.)
 */
export function ToastStack<T>({
  items,
  renderItem,
  getKey = defaultKey,
  depth = 2,
  offset = 8,
  scaleStep = 0.05,
  frontIndex: controlledFront,
  defaultFrontIndex = 0,
  onFrontIndexChange,
  position = "bottom-right",
  label = "Notifications",
  cardClassName,
  className,
}: ToastStackProps<T>) {
  const [rawFront, setFront] = useControllableState(
    controlledFront,
    defaultFrontIndex,
    onFrontIndexChange,
  );
  const count = items.length;
  // Clamped for display rather than corrected through onChange: a list that
  // shrinks under a far-forward index must not make render report a change.
  const front = count === 0 ? 0 : ((rawFront % count) + count) % count;

  const stackRef = useRef<HTMLDivElement>(null);
  const wheelTravel = useRef(0);
  const live = useRef({ front, count });
  live.current = { front, count };

  const step = (by: number) => {
    const { front: current, count: n } = live.current;
    if (n < 2) return;
    setFront((((current + by) % n) + n) % n);
  };
  const stepRef = useRef(step);
  stepRef.current = step;

  /*
   * A native listener, because React's wheel listener is passive and cannot stop
   * the page scrolling underneath — and a stack that cycles AND scrolls the page
   * moves two things at once under the person's hand.
   */
  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (live.current.count < 2 || e.deltaY === 0) return;
      e.preventDefault();

      // Line or page mode: every event is a notch.
      if (e.deltaMode !== 0) {
        wheelTravel.current = 0;
        stepRef.current(Math.sign(e.deltaY));
        return;
      }
      // A notch-sized event steps at once; small trackpad deltas add up first.
      if (Math.abs(e.deltaY) >= WHEEL_STEP) {
        wheelTravel.current = 0;
        stepRef.current(Math.sign(e.deltaY));
        return;
      }
      wheelTravel.current += e.deltaY;
      if (Math.abs(wheelTravel.current) >= WHEEL_STEP) {
        stepRef.current(Math.sign(wheelTravel.current));
        wheelTravel.current = 0;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // Re-bound when the element can change: it appears with the first item, and
    // moving between a corner and inline remounts it.
  }, [count > 0, position]);

  if (count === 0) return null;

  const visibleBehind = Math.min(Math.max(0, depth), count - 1);
  const hidden = count - 1 - visibleBehind;

  const card = (index: number, k: number) => {
    const item = items[index];
    const isFront = k === 0;
    return (
      <div
        key={getKey(item, index)}
        data-react-fancy-toast-stack-card={isFront ? "front" : "behind"}
        aria-hidden={isFront ? undefined : true}
        inert={isFront ? undefined : true}
        className={cn(
          CARD,
          "origin-top transition-transform duration-200",
          isFront ? "relative" : "pointer-events-none absolute inset-0 overflow-hidden",
          cardClassName,
        )}
        style={{
          zIndex: depth + 1 - k,
          transform: isFront ? undefined : `translateY(-${k * offset}px) scale(${1 - k * scaleStep})`,
        }}
      >
        {renderItem(item, { index, isFront })}
      </div>
    );
  };

  const stackEl = (
    <div
      ref={stackRef}
      data-react-fancy-toast-stack=""
      role="region"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (isTextField(e.target)) return;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          step(1);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          step(-1);
        }
      }}
      className={cn(
        "pointer-events-auto relative w-80 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
        className,
      )}
      style={{ paddingTop: visibleBehind * offset }}
    >
      <div className="relative">
        {/* z-index decides what paints on top; the front card sizes the box. */}
        {Array.from({ length: visibleBehind }, (_, i) => i + 1).map((k) =>
          card((front + k) % count, k),
        )}
        {card(front, 0)}
      </div>
      {hidden > 0 && (
        <Badge
          data-react-fancy-toast-stack-more=""
          size="sm"
          variant="soft"
          color="zinc"
          className="absolute -top-2 right-2 z-20"
        >
          +{hidden}
        </Badge>
      )}
      <span data-react-fancy-toast-stack-status="" aria-live="polite" className="sr-only">
        {count > 1 ? `${front + 1} of ${count}` : ""}
      </span>
    </div>
  );

  if (position === "inline") return stackEl;

  return (
    <Portal>
      <div
        data-react-fancy-toast-stack-position={position}
        className={cn("pointer-events-none fixed z-[100]", POSITION_STYLES[position])}
      >
        {stackEl}
      </div>
    </Portal>
  );
}

ToastStack.displayName = "ToastStack";
