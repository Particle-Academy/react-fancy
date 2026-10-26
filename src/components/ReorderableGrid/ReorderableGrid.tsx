import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  Ref,
} from "react";
import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { moveItem } from "./move-item";
import type {
  ReorderableGridAnnouncementContext,
  ReorderableGridItem,
  ReorderableGridLabels,
  ReorderableGridProps,
} from "./ReorderableGrid.types";

/*
 * Literal class names, not `grid-cols-${n}`: Tailwind only generates classes it
 * can read in source, and the consumer's build scans this file's dist. That is
 * also why the column count is not an inline style, as Grid's is.
 */
const COLUMN_CLASSES = [
  "grid-cols-1",
  "grid-cols-2",
  "grid-cols-3",
  "grid-cols-4",
  "grid-cols-5",
  "grid-cols-6",
  "grid-cols-7",
  "grid-cols-8",
  "grid-cols-9",
  "grid-cols-10",
  "grid-cols-11",
  "grid-cols-12",
] as const;

const GAP_CLASSES = { none: "gap-0", sm: "gap-3", md: "gap-6", lg: "gap-10" } as const;

const FOCUS_RING =
  "ring-[color:var(--fancy-focus,var(--color-blue-500))] dark:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]";

const CELL_BASE =
  "relative min-w-0 select-none touch-none outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))] dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]";

const CELL_STYLED =
  "rounded-lg border p-3 text-sm " +
  "border-[color:var(--fancy-border,var(--color-zinc-200))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] " +
  "bg-[color:var(--fancy-surface,var(--color-white))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] " +
  "text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]";

const CELL_LOCKED_STYLED =
  "border-dashed bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]";

/** Movement before a press becomes a drag, so clicks inside a cell still click. */
const DRAG_THRESHOLD = 4;
/** Distance from a scroll container's edge at which a drag starts scrolling it. */
const EDGE = 48;
const MAX_SCROLL_STEP = 18;
const SHIFT_MS = 150;

/** A press on one of these inside a cell is the element's, not a drag (unless it is the handle). */
const INTERACTIVE = "input, textarea, select, button, a[href], [contenteditable=''], [contenteditable='true']";

const DEFAULT_LABELS: ReorderableGridLabels = {
  instructions:
    "Press Space or Enter to pick up. Use the arrow keys to move, Space or Enter to drop, Escape to cancel.",
  roleDescription: "reorderable item",
  pickedUp: (c) =>
    `Picked up ${c.label} at position ${c.position} of ${c.total}, row ${c.row} column ${c.column}. ` +
    "Arrow keys move it, Space or Enter drops it, Escape cancels",
  moved: (c) => `Moved to position ${c.position} of ${c.total}, row ${c.row} column ${c.column}`,
  dropped: (c) => `Dropped ${c.label} at position ${c.position} of ${c.total}, row ${c.row} column ${c.column}`,
  cancelled: (c) =>
    `Cancelled. ${c.label} returned to position ${c.position} of ${c.total}, row ${c.row} column ${c.column}`,
  locked: (c) => `${c.label} is locked and cannot be moved`,
};

/**
 * The order to show: `order`'s known ids first, then any item it does not
 * mention, in `items` order. A stale or partial order can never hide a cell.
 */
function resolveOrder(order: readonly string[] | undefined, items: readonly ReorderableGridItem[]): string[] {
  const ids = items.map((i) => i.id);
  const known = new Set(ids);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of order ?? []) {
    if (known.has(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Mode = "pointer" | "keyboard";

interface Session {
  id: string;
  mode: Mode;
  /** The committed order when the interaction began. Cancel returns here. */
  origin: string[];
  originIndex: number;
  /** Where the item would land. `null`: the pointer is outside the grid, and a release cancels. */
  target: number | null;
}

interface PointerDrag {
  id: string;
  pointerId: number;
  /** The cell's layout offset when the drag began. */
  startOffset: { x: number; y: number };
  /** Pointer, in the grid's coordinates, when the drag began. */
  startPos: { x: number; y: number };
  clientX: number;
  clientY: number;
  scroller: HTMLElement | null;
}

/** Nearest ancestor that can scroll, else the document's scroller. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY + s.overflowX)) {
      if (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth) return p;
    }
  }
  return (document.scrollingElement as HTMLElement | null) ?? null;
}

function ReorderableGridInner<T extends ReorderableGridItem>(
  {
    items,
    value,
    defaultValue,
    onReorder,
    renderItem,
    columns = 2,
    gap = "sm",
    disabled = false,
    label,
    getItemLabel,
    labels: labelOverrides,
    unstyled = false,
    cellClassName,
    className,
    ...props
  }: ReorderableGridProps<T>,
  forwardedRef: Ref<HTMLDivElement>,
) {
  const cols = Math.min(12, Math.max(1, Math.round(columns) || 1));
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...labelOverrides }), [labelOverrides]);

  // ── order ────────────────────────────────────────────────────────────────
  const [stored, setStored] = useControllableState<string[] | undefined>(value, defaultValue, (next) => {
    if (next) onReorder?.(next);
  });
  const committed = useMemo(() => resolveOrder(stored, items), [stored, items]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const lockedIds = useMemo(() => items.filter((i) => i.locked).map((i) => i.id), [items]);
  const isLocked = useCallback((id: string) => byId.get(id)?.locked === true, [byId]);

  const [session, setSessionState] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const setSession = useCallback((s: Session | null) => {
    sessionRef.current = s;
    setSessionState(s);
  }, []);

  const previewOf = useCallback(
    (s: Session): string[] =>
      s.target === null || s.target === s.originIndex
        ? s.origin
        : moveItem(s.origin, s.originIndex, s.target, { locked: lockedIds }),
    [lockedIds],
  );

  const shown = useMemo(
    () => (session ? resolveOrder(previewOf(session), items) : committed),
    [session, previewOf, items, committed],
  );
  const shownRef = useRef(shown);
  shownRef.current = shown;

  // ── announcements ────────────────────────────────────────────────────────
  const [announcement, setAnnouncement] = useState("");
  const labelOf = useCallback(
    (id: string) => {
      const item = byId.get(id);
      if (!item) return id;
      if (getItemLabel) return getItemLabel(item);
      const l = (item as { label?: unknown }).label;
      return typeof l === "string" ? l : id;
    },
    [byId, getItemLabel],
  );
  const ctxAt = useCallback(
    (id: string, index: number, total: number): ReorderableGridAnnouncementContext => ({
      id,
      label: labelOf(id),
      position: index + 1,
      total,
      row: Math.floor(index / cols) + 1,
      column: (index % cols) + 1,
    }),
    [labelOf, cols],
  );

  // ── elements ─────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const cellRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) cellRefs.current.set(id, el);
      else cellRefs.current.delete(id);
    },
    [],
  );

  const instructionsId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const tabStop = activeId !== null && shown.includes(activeId) ? activeId : shown[0];
  /** Focus to put back after a drop or cancel moves the focused node. */
  const refocus = useRef<string | null>(null);

  // ── commit / cancel ──────────────────────────────────────────────────────
  const drag = useRef<PointerDrag | null>(null);
  const pending = useRef<{ id: string; pointerId: number; clientX: number; clientY: number } | null>(null);
  const scrollFrame = useRef<number | null>(null);

  const settle = useCallback((id: string) => {
    const el = cellRefs.current.get(id);
    if (!el) return;
    if (el.style.transform && !prefersReducedMotion()) {
      el.style.transition = `transform ${SHIFT_MS}ms ease`;
      window.setTimeout(() => {
        if (!el.style.transform) el.style.transition = "";
      }, SHIFT_MS + 50);
    }
    el.style.transform = "";
  }, []);

  const endPointer = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    pending.current = null;
    if (scrollFrame.current !== null) {
      cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    }
    if (!d) return;
    const root = rootRef.current;
    if (root?.hasPointerCapture?.(d.pointerId)) root.releasePointerCapture?.(d.pointerId);
    settle(d.id);
  }, [settle]);

  const cancel = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    endPointer();
    setSession(null);
    if (s.mode === "keyboard") refocus.current = s.id;
    setAnnouncement(labels.cancelled(ctxAt(s.id, s.originIndex, s.origin.length)));
  }, [ctxAt, endPointer, labels, setSession]);

  const drop = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    if (s.target === null) {
      cancel();
      return;
    }
    const final = previewOf(s);
    endPointer();
    setSession(null);
    if (s.mode === "keyboard") refocus.current = s.id;
    setAnnouncement(labels.dropped(ctxAt(s.id, s.target, final.length)));
    if (!sameOrder(final, s.origin)) setStored(final);
  }, [cancel, ctxAt, endPointer, labels, previewOf, setSession, setStored]);

  // Escape joins the kit's layer stack, so inside a Modal or a full-screen
  // surface it cancels the pick-up before it closes anything else.
  useEscapeKey(cancel, session !== null);

  useEffect(() => {
    if (disabled) cancel();
  }, [disabled, cancel]);

  useEffect(() => () => endPointer(), [endPointer]);

  const begin = useCallback(
    (id: string, mode: Mode): boolean => {
      const origin = shownRef.current;
      const index = origin.indexOf(id);
      if (index < 0) return false;
      if (isLocked(id)) {
        setAnnouncement(labels.locked(ctxAt(id, index, origin.length)));
        return false;
      }
      setSession({ id, mode, origin, originIndex: index, target: index });
      setAnnouncement(labels.pickedUp(ctxAt(id, index, origin.length)));
      return true;
    },
    [ctxAt, isLocked, labels, setSession],
  );

  const retarget = useCallback(
    (target: number | null) => {
      const s = sessionRef.current;
      if (!s || target === s.target) return;
      setSession({ ...s, target });
      if (target !== null) setAnnouncement(labels.moved(ctxAt(s.id, target, s.origin.length)));
    },
    [ctxAt, labels, setSession],
  );

  // ── keyboard ─────────────────────────────────────────────────────────────

  /**
   * The slot an arrow key leads to from `from`, or null for none. Left/Right
   * step one slot, Up/Down one row. When `skipLocked`, a pinned slot is passed
   * over: Left/Right go on to the next free slot that way; Up/Down take the
   * nearest free slot after the pinned one in reading order (forward for Down,
   * backward for Up). Down from a row above a short last row lands on the last
   * slot.
   */
  const step = useCallback(
    (order: string[], from: number, key: string, skipLocked: boolean): number | null => {
      const n = order.length;
      const free = (i: number) => !skipLocked || !isLocked(order[i] as string);
      const scan = (start: number, dir: 1 | -1) => {
        for (let i = start; i >= 0 && i < n; i += dir) if (free(i)) return i;
        return null;
      };
      switch (key) {
        case "ArrowRight":
          return scan(from + 1, 1);
        case "ArrowLeft":
          return scan(from - 1, -1);
        case "ArrowDown": {
          let t = from + cols;
          if (t > n - 1) {
            if (Math.floor(from / cols) >= Math.floor((n - 1) / cols)) return null;
            t = n - 1;
          }
          return scan(t, 1);
        }
        case "ArrowUp":
          return from - cols < 0 ? null : scan(from - cols, -1);
        case "Home":
          return scan(0, 1);
        case "End":
          return scan(n - 1, -1);
        default:
          return null;
      }
    },
    [cols, isLocked],
  );

  const onCellKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>, id: string) => {
    // Keys typed into a field inside the cell belong to the field.
    if (disabled || e.target !== e.currentTarget) return;
    const s = sessionRef.current;

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (s?.mode === "keyboard") drop();
      else if (!s) begin(id, "keyboard");
      return;
    }

    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();

    if (s?.mode === "keyboard") {
      if (s.target === null) return;
      const t = step(shownRef.current, s.target, e.key, true);
      if (t !== null) retarget(t);
      return;
    }
    if (s) return;

    const order = shownRef.current;
    const t = step(order, order.indexOf(id), e.key, false);
    if (t === null) return;
    const next = order[t] as string;
    setActiveId(next);
    cellRefs.current.get(next)?.focus();
  };

  // ── pointer ──────────────────────────────────────────────────────────────

  /** Client point to the grid's own coordinates (the space cell offsets are in). */
  const toLocal = (clientX: number, clientY: number) => {
    const root = rootRef.current!;
    const r = root.getBoundingClientRect();
    return { x: clientX - r.left - root.clientLeft, y: clientY - r.top - root.clientTop, rect: r };
  };

  /**
   * The slot under the pointer. Kanban's rule (compare the pointer with each
   * card's box) extended to two dimensions: the nearest cell box wins, so a
   * point in a gutter belongs to the closer neighbour. Boxes are layout
   * offsets, which ignore transforms, so cells mid-animation do not move the
   * target. Outside the grid is `null`: a release there cancels. A pinned cell
   * is not a target; the current target stands.
   */
  const hitTest = (clientX: number, clientY: number): number | null => {
    const s = sessionRef.current;
    if (!s) return null;
    const { x, y, rect } = toLocal(clientX, clientY);
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;

    const order = shownRef.current;
    let best = -1;
    let bestDist = Infinity;
    order.forEach((id, i) => {
      const el = cellRefs.current.get(id);
      if (!el) return;
      const l = el.offsetLeft;
      const t = el.offsetTop;
      const dx = Math.max(l - x, 0, x - (l + el.offsetWidth));
      const dy = Math.max(t - y, 0, y - (t + el.offsetHeight));
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best < 0) return s.target;
    if (isLocked(order[best] as string)) return s.target ?? s.originIndex;
    return best;
  };

  /** The dragged cell follows the pointer from where it STARTED, whatever slot it now has. */
  const applyDragTransform = useCallback(() => {
    const d = drag.current;
    const root = rootRef.current;
    if (!d || !root) return;
    const el = cellRefs.current.get(d.id);
    if (!el) return;
    const r = root.getBoundingClientRect();
    const px = d.clientX - r.left - root.clientLeft;
    const py = d.clientY - r.top - root.clientTop;
    const tx = d.startOffset.x + (px - d.startPos.x) - el.offsetLeft;
    const ty = d.startOffset.y + (py - d.startPos.y) - el.offsetTop;
    el.style.transition = "";
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  }, []);

  const track = () => {
    const d = drag.current;
    if (!d) return;
    retarget(hitTest(d.clientX, d.clientY));
    applyDragTransform();
  };

  /** Scroll the nearest scroller while the pointer is near its edge. */
  const autoScroll = () => {
    const d = drag.current;
    if (!d?.scroller || typeof requestAnimationFrame !== "function") return;
    const sc = d.scroller;
    const isDoc = sc === document.scrollingElement;
    const box = isDoc
      ? { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth }
      : sc.getBoundingClientRect();
    const speed = (dist: number) => (dist < EDGE ? Math.ceil(((EDGE - dist) / EDGE) * MAX_SCROLL_STEP) : 0);
    let vy = speed(d.clientY - box.top) ? -speed(d.clientY - box.top) : speed(box.bottom - d.clientY);
    let vx = speed(d.clientX - box.left) ? -speed(d.clientX - box.left) : speed(box.right - d.clientX);
    // Only where it can actually go.
    if ((vy < 0 && sc.scrollTop <= 0) || (vy > 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight)) vy = 0;
    if ((vx < 0 && sc.scrollLeft <= 0) || (vx > 0 && sc.scrollLeft + sc.clientWidth >= sc.scrollWidth)) vx = 0;
    if (!vx && !vy) {
      scrollFrame.current = null;
      return;
    }
    if (scrollFrame.current !== null) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      if (!drag.current) return;
      sc.scrollTop += vy;
      sc.scrollLeft += vx;
      track();
      autoScroll();
    });
  };

  const onCellPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (disabled || e.button !== 0 || sessionRef.current || isLocked(id)) return;
    const cellEl = e.currentTarget;
    const target = e.target as Element;
    const handle = target.closest("[data-reorderable-handle]");
    if (handle && cellEl.contains(handle)) {
      // The handle: always a drag.
    } else if (cellEl.querySelector("[data-reorderable-handle]")) {
      return; // This cell has a handle and the press was elsewhere.
    } else {
      const interactive = target.closest(INTERACTIVE);
      if (interactive && interactive !== cellEl && cellEl.contains(interactive)) return;
    }
    pending.current = { id, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY };
  };

  const onRootPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = pending.current;
    if (p && p.pointerId === e.pointerId && !drag.current) {
      if (Math.hypot(e.clientX - p.clientX, e.clientY - p.clientY) < DRAG_THRESHOLD) return;
      const root = rootRef.current;
      const el = cellRefs.current.get(p.id);
      pending.current = null;
      if (!root || !el || !begin(p.id, "pointer")) return;
      // Capture on the ROOT, never the cell: the live preview moves the cell's
      // DOM node, and moving a node can drop a capture held on it.
      root.setPointerCapture?.(e.pointerId);
      window.getSelection?.()?.removeAllRanges();
      const start = toLocal(p.clientX, p.clientY);
      drag.current = {
        id: p.id,
        pointerId: e.pointerId,
        startOffset: { x: el.offsetLeft, y: el.offsetTop },
        startPos: { x: start.x, y: start.y },
        clientX: e.clientX,
        clientY: e.clientY,
        scroller: scrollParent(root),
      };
    }
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    d.clientX = e.clientX;
    d.clientY = e.clientY;
    track();
    autoScroll();
  };

  const onRootPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pending.current?.pointerId === e.pointerId) {
      pending.current = null;
      return;
    }
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    d.clientX = e.clientX;
    d.clientY = e.clientY;
    const target = hitTest(e.clientX, e.clientY);
    const s = sessionRef.current;
    if (s && target !== s.target) {
      // Commit what the release point says, not the last move event.
      sessionRef.current = { ...s, target };
    }
    drop();
  };

  const onRootPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pending.current?.pointerId === e.pointerId) pending.current = null;
    if (drag.current?.pointerId === e.pointerId) cancel();
  };

  // ── layout effects: follow the pointer, shift the others, keep focus ──────

  const offsets = useRef(new Map<string, { x: number; y: number }>());
  const shiftTimers = useRef(new Map<string, number>());
  const shownKey = shown.join("\u0000");

  useLayoutEffect(() => {
    const prev = offsets.current;
    const next = new Map<string, { x: number; y: number }>();
    for (const [id, el] of cellRefs.current) next.set(id, { x: el.offsetLeft, y: el.offsetTop });
    offsets.current = next;

    // FLIP: cells the preview displaced slide from where they were.
    if (prev.size && !prefersReducedMotion()) {
      for (const [id, el] of cellRefs.current) {
        if (id === drag.current?.id) continue;
        const a = prev.get(id);
        const b = next.get(id);
        if (!a || !b || (a.x === b.x && a.y === b.y)) continue;
        el.style.transition = "none";
        el.style.transform = `translate3d(${a.x - b.x}px, ${a.y - b.y}px, 0)`;
        void el.offsetWidth;
        el.style.transition = `transform ${SHIFT_MS}ms ease`;
        el.style.transform = "";
        const old = shiftTimers.current.get(id);
        if (old !== undefined) window.clearTimeout(old);
        shiftTimers.current.set(
          id,
          window.setTimeout(() => {
            shiftTimers.current.delete(id);
            if (!el.style.transform) el.style.transition = "";
          }, SHIFT_MS + 50),
        );
      }
    }

    applyDragTransform();

    // React moves DOM nodes to reorder them, and a moved node can lose focus.
    const s = sessionRef.current;
    const keep = s?.mode === "keyboard" ? s.id : refocus.current;
    refocus.current = null;
    if (keep) {
      const el = cellRefs.current.get(keep);
      if (el && document.activeElement !== el) el.focus();
    }
  }, [shownKey, session, applyDragTransform]);

  useEffect(() => {
    const timers = shiftTimers.current;
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
    };
  }, []);

  // ── render ───────────────────────────────────────────────────────────────

  const state = session ? (session.mode === "pointer" ? "dragging" : "picked-up") : "idle";
  const dropIndex = session && session.target !== null ? session.target : undefined;
  const total = shown.length;

  return (
    <div
      {...props}
      ref={composeRefs(rootRef, forwardedRef)}
      data-react-fancy-reorderable-grid=""
      data-columns={cols}
      data-state={state}
      data-drop-index={dropIndex}
      data-disabled={disabled ? "" : undefined}
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onPointerMove={onRootPointerMove}
      onPointerUp={onRootPointerUp}
      onPointerCancel={onRootPointerCancel}
      onLostPointerCapture={(e) => {
        if (drag.current?.pointerId === e.pointerId) cancel();
      }}
      className={cn(
        "relative grid",
        COLUMN_CLASSES[cols - 1],
        GAP_CLASSES[gap],
        session?.mode === "pointer" && "cursor-grabbing select-none",
        disabled && "opacity-60",
        className,
      )}
    >
      {shown.map((id, index) => {
        const item = byId.get(id);
        if (!item) return null;
        const locked = item.locked === true;
        const active = session?.id === id;
        const dragging = active && session?.mode === "pointer";
        const pickedUp = active && session?.mode === "keyboard";
        const dropTarget = active && dropIndex === index;
        const outside = active && session?.target === null;
        const itemState = {
          index,
          position: index + 1,
          row: Math.floor(index / cols) + 1,
          column: (index % cols) + 1,
          total,
          dragging,
          pickedUp,
          dropTarget,
          locked,
          disabled,
          handleProps: { "data-reorderable-handle": "" as const },
        };
        return (
          <div
            key={id}
            ref={cellRef(id)}
            data-react-fancy-reorderable-grid-item=""
            data-reorderable-id={id}
            data-index={index}
            data-state={dragging ? "dragging" : pickedUp ? "picked-up" : "idle"}
            data-locked={locked ? "true" : undefined}
            data-drop-target={dropTarget ? "" : undefined}
            role="button"
            aria-roledescription={labels.roleDescription}
            aria-describedby={instructionsId}
            aria-pressed={active}
            aria-disabled={disabled || locked || undefined}
            tabIndex={disabled ? -1 : id === tabStop ? 0 : -1}
            onFocus={(e) => {
              if (e.target === e.currentTarget) setActiveId(id);
            }}
            onKeyDown={(e) => onCellKeyDown(e, id)}
            onPointerDown={(e) => onCellPointerDown(e, id)}
            className={cn(
              CELL_BASE,
              !unstyled && CELL_STYLED,
              !unstyled && locked && CELL_LOCKED_STYLED,
              locked || disabled ? "cursor-default" : "cursor-grab",
              dragging && cn("z-10 cursor-grabbing shadow-lg ring-2", FOCUS_RING),
              pickedUp && cn("z-10 shadow-md ring-2", FOCUS_RING),
              outside && "opacity-60",
              cellClassName,
            )}
          >
            {renderItem ? renderItem(item, itemState) : labelOf(id)}
          </div>
        );
      })}
      <div id={instructionsId} className="sr-only">
        {labels.instructions}
      </div>
      <div data-react-fancy-reorderable-grid-live="" aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/**
 * A grid of cells reordered in place, row-major, by pointer or keyboard.
 *
 * Built for field-order designers: the grid looks like the grid it designs.
 * Order is a list of ids (`value` / `defaultValue` / `onReorder`); the pure
 * `moveItem(ids, from, to, { locked })` is the same rule without a DOM, for
 * agents.
 */
export const ReorderableGrid = forwardRef(ReorderableGridInner) as (<T extends ReorderableGridItem>(
  props: ReorderableGridProps<T> & { ref?: Ref<HTMLDivElement> },
) => ReactElement) & { displayName?: string };

ReorderableGrid.displayName = "ReorderableGrid";
