import { Children, forwardRef, useCallback, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { cn } from "../../utils/cn";
import type { ResizablePanelsProps } from "./ResizablePanels.types";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Two decimals: precise enough for a pixel on a 4K row, tidy in JSON. */
function tidy(n: number): number {
  return Math.round(n * 100) / 100;
}

const SEPARATOR_BASE =
  "relative shrink-0 touch-none select-none outline-none transition-colors " +
  "bg-[color:var(--fancy-border,var(--color-zinc-200))] dark:bg-[color:var(--fancy-border-dark,var(--color-zinc-700))] " +
  "focus-visible:bg-[color:var(--fancy-focus,var(--color-blue-500))] dark:focus-visible:bg-[color:var(--fancy-focus-dark,var(--color-blue-400))] " +
  "focus-visible:ring-2 focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))]/40 dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]/40";

const SEPARATOR_ACTIVE =
  "hover:bg-[color:var(--fancy-focus,var(--color-blue-500))] dark:hover:bg-[color:var(--fancy-focus-dark,var(--color-blue-400))]";

/**
 * Two panels and a draggable, keyboard-operable separator between them — the
 * W3C window-splitter pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/).
 *
 * `value` is the PRIMARY (first) panel's share of the container, as a
 * percentage. The separator is `role="separator"` with `aria-valuenow/min/max`,
 * `aria-controls` pointing at the primary panel, and a tab stop. Arrow keys
 * along the drag axis move it by `step`, Shift + Arrow by `largeStep`, Home /
 * End jump to `min` / `max`. Pointer and touch drags use pointer capture, so a
 * fast drag that leaves the bar keeps resizing.
 *
 * `onValueChange` fires continuously; `onValueCommit` fires once per gesture
 * (pointer release, key release) so a host can persist a per-user size without
 * writing on every frame. The host owns persistence.
 */
export const ResizablePanels = forwardRef<HTMLDivElement, ResizablePanelsProps>(
  (
    {
      children,
      value,
      defaultValue = 50,
      onValueChange,
      onValueCommit,
      min = 10,
      max = 90,
      orientation = "horizontal",
      step = 5,
      largeStep = 20,
      label = "Resize panels",
      disabled = false,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    // Never past the container, whatever min/max say.
    const lo = clamp(min, 0, 100);
    const hi = Math.max(lo, clamp(max, 0, 100));

    const [internal, setInternal] = useState(defaultValue);
    const controlled = value !== undefined;
    const current = tidy(clamp(controlled ? value : internal, lo, hi));

    /*
     * The value most recently ASKED FOR, re-synced to what is rendered on every
     * render. Several key repeats can land before React re-renders; reading the
     * render-time value would make each of them compute from the same start.
     */
    const latest = useRef(current);
    latest.current = current;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const firstId = useId();
    const horizontal = orientation === "horizontal";

    const request = useCallback(
      (next: number) => {
        const v = tidy(clamp(next, lo, hi));
        if (v === latest.current) return;
        latest.current = v;
        if (!controlled) setInternal(v);
        onValueChange?.(v);
      },
      [controlled, hi, lo, onValueChange],
    );

    // --- keyboard -----------------------------------------------------------

    const keyChanged = useRef(false);

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const dec = horizontal ? "ArrowLeft" : "ArrowUp";
      const inc = horizontal ? "ArrowRight" : "ArrowDown";
      const by = e.shiftKey ? largeStep : step;
      let next: number;
      if (e.key === dec) next = latest.current - by;
      else if (e.key === inc) next = latest.current + by;
      else if (e.key === "Home") next = lo;
      else if (e.key === "End") next = hi;
      else return;
      e.preventDefault();
      const before = latest.current;
      request(next);
      if (latest.current !== before) keyChanged.current = true;
    };

    const onKeyUp = () => {
      if (!keyChanged.current) return;
      keyChanged.current = false;
      onValueCommit?.(latest.current);
    };

    // --- pointer ------------------------------------------------------------

    const drag = useRef<{ pointerId: number; start: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    const valueAt = (clientX: number, clientY: number): number | null => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const size = horizontal ? rect.width : rect.height;
      if (!size) return null;
      const offset = horizontal ? clientX - rect.left : clientY - rect.top;
      return (offset / size) * 100;
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      drag.current = { pointerId: e.pointerId, start: latest.current };
      setDragging(true);
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
      if (!drag.current || drag.current.pointerId !== e.pointerId) return;
      const v = valueAt(e.clientX, e.clientY);
      if (v !== null) request(v);
    };

    const endDrag = (e: PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      drag.current = null;
      setDragging(false);
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
      if (latest.current !== d.start) onValueCommit?.(latest.current);
    };

    const items = Children.toArray(children);

    return (
      <div
        ref={setRefs}
        {...props}
        data-react-fancy-resizable-panels=""
        data-orientation={orientation}
        data-dragging={dragging ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "flex h-full w-full min-h-0 min-w-0 overflow-hidden",
          horizontal ? "flex-row" : "flex-col",
          dragging && (horizontal ? "cursor-col-resize select-none" : "cursor-row-resize select-none"),
          className,
        )}
      >
        <div
          id={firstId}
          data-react-fancy-resizable-panels-panel="first"
          className="min-h-0 min-w-0 overflow-auto"
          style={{ flexBasis: `${current}%`, flexGrow: 0, flexShrink: 0 }}
        >
          {items[0]}
        </div>
        <div
          role="separator"
          data-react-fancy-resizable-panels-separator=""
          aria-orientation={horizontal ? "vertical" : "horizontal"}
          aria-valuenow={current}
          aria-valuemin={lo}
          aria-valuemax={hi}
          aria-controls={firstId}
          aria-label={label}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          className={cn(
            SEPARATOR_BASE,
            // A 1px line with a 12px hit area, so it is easy to grab by touch.
            horizontal
              ? "w-px before:absolute before:inset-y-0 before:-left-1.5 before:-right-1.5"
              : "h-px before:absolute before:inset-x-0 before:-top-1.5 before:-bottom-1.5",
            disabled
              ? "cursor-default opacity-50"
              : cn(SEPARATOR_ACTIVE, horizontal ? "cursor-col-resize" : "cursor-row-resize"),
          )}
        />
        <div
          data-react-fancy-resizable-panels-panel="second"
          className="min-h-0 min-w-0 flex-1 overflow-auto"
        >
          {items[1]}
        </div>
      </div>
    );
  },
);

ResizablePanels.displayName = "ResizablePanels";
