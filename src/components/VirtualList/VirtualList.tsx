import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, TouchEvent, WheelEvent } from "react";
import { cn } from "../../utils/cn";
import type { VirtualListProps, VirtualListRow } from "./VirtualList.types";

/**
 * A windowed list for ledgers that run to tens of thousands of rows — only the
 * visible slice is in the DOM, with **measured** variable row heights, deep
 * links by row id, and sticky-bottom tail-following.
 *
 * Built for an agent event stream, where every one of those three is load
 * bearing at once: message rows wrap and event rows do not, a link carries
 * `?at=<rowId>` to the exact row under discussion, and new rows arrive while
 * the human is reading older ones.
 *
 * ## Heights are measured, never predicted
 *
 * `estimateRowHeight` only seeds rows that have never been on screen. The
 * moment a row renders, its real height is measured and replaces the estimate,
 * and every offset after it moves. The alternative — a `rowHeight(item)`
 * callback — is a prediction about text wrapping, font loading and container
 * width, and when it is wrong the error accumulates down the list: rows draw in
 * the wrong place and `scrollToId` lands on a neighbour. Measuring is slower to
 * settle and correct when it does.
 *
 * ## Tail-follow breaks on INTENT, not on position
 *
 * Any upward gesture — wheel, drag, PageUp, Home — stops following
 * immediately, even when the list is still pinned to the bottom and
 * `scrollTop` has not changed yet. Position cannot tell "the human scrolled
 * up" from "content grew downward", so a position-only implementation keeps
 * following through a wheel-up and yanks the reader back on the next append.
 *
 * ## It is controlled
 *
 * `followTail` is the consumer's state. This component only ever *asks* via
 * `onFollowChange`, so the follow state is readable and writable by an agent
 * over a bridge, as the Human+ component contract requires. The `↓ n new` pill
 * is the consumer's to render, from `onUnseenChange`.
 *
 * @example
 * ```tsx
 * const [following, setFollowing] = useState(true);
 * const [unseen, setUnseen] = useState(0);
 *
 * <VirtualList
 *   items={events}
 *   renderRow={(e) => <StreamRow event={e} />}
 *   height="100%"
 *   estimateRowHeight={28}
 *   followTail={following}
 *   onFollowChange={setFollowing}
 *   onUnseenChange={setUnseen}
 *   scrollToId={params.at}
 * />
 * {!following && unseen > 0 && (
 *   <Button onClick={() => setFollowing(true)}>↓ {unseen} new</Button>
 * )}
 * ```
 */
export function VirtualList<T extends VirtualListRow>({
  items,
  renderRow,
  height = "100%",
  estimateRowHeight = 32,
  overscan = 6,
  followTail = false,
  onFollowChange,
  onUnseenChange,
  scrollToId = null,
  onScrollToIdResolved,
  className,
  ref,
  ...props
}: VirtualListProps<T>) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);

  /** Measured heights by row id, so a height follows its row across a reindex. */
  const heights = useRef(new Map<string, number>());
  /** Bumped when a measurement actually changed, to recompute offsets. */
  const [measured, setMeasured] = useState(0);

  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const attachViewport = useCallback(
    (el: HTMLDivElement | null) => {
      viewportRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = el;
    },
    [ref],
  );

  // A number `height` IS the viewport height, and is usable before the element
  // has been measured. Without one, render a conservative first window so there
  // is something on screen for the measurement pass to work from.
  const viewport =
    clientHeight > 0 ? clientHeight : typeof height === "number" ? height : estimateRowHeight * 20;

  /**
   * Prefix sums of row heights: `offsets[i]` is where row `i` starts, and the
   * last entry is the total. Rebuilt whenever rows or measurements change —
   * O(n) once per change, against O(log n) per scroll from the binary search,
   * rather than O(n) on every scroll frame.
   */
  const { offsets, total } = useMemo(() => {
    const offs = new Float64Array(items.length + 1);
    for (let i = 0; i < items.length; i += 1) {
      offs[i + 1] = offs[i] + (heights.current.get(items[i].id) ?? estimateRowHeight);
    }

    return { offsets: offs, total: items.length === 0 ? 0 : offs[items.length] };
  }, [items, measured, estimateRowHeight]);

  /** First row whose span contains `y`. */
  const indexAt = useCallback(
    (y: number): number => {
      let lo = 0;
      let hi = items.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (offsets[mid] <= y) lo = mid;
        else hi = mid - 1;
      }

      return Math.max(0, lo);
    },
    [items.length, offsets],
  );

  const start = Math.max(0, indexAt(scrollTop) - overscan);
  const end = Math.min(items.length, indexAt(scrollTop + viewport) + 1 + overscan);
  const visible = useMemo(() => items.slice(start, end), [items, start, end]);

  // ---------------------------------------------------------------- measuring

  const observer = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    // Absent in jsdom and in older runtimes. Without it the list still measures
    // on every render; it just does not notice a row reflowing in place.
    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => setMeasured((v) => v + 1));
    observer.current = ro;

    return () => {
      ro.disconnect();
      observer.current = null;
    };
  }, []);

  // No dependency array on purpose: every render re-measures what is on screen,
  // and the `changed` guard is what stops it looping. A render that learns
  // nothing new sets no state.
  useLayoutEffect(() => {
    const win = windowRef.current;
    if (!win) return;

    let changed = false;
    for (const el of Array.from(win.children) as HTMLElement[]) {
      const id = el.getAttribute(ROW_ID_ATTR);
      if (id === null) continue;

      observer.current?.observe(el);

      const h = el.getBoundingClientRect().height;
      // A zero height is "not laid out yet", not a 0px row. Recording it would
      // collapse the list and make every offset after it wrong.
      if (h > 0 && heights.current.get(id) !== h) {
        heights.current.set(id, h);
        changed = true;
      }
    }

    const vp = viewportRef.current;
    if (vp && vp.clientHeight > 0 && vp.clientHeight !== clientHeight) setClientHeight(vp.clientHeight);

    if (changed) setMeasured((v) => v + 1);
  });

  // ------------------------------------------------------------- deep linking

  /** The target this component last moved to, to detect that it has settled. */
  const anchored = useRef<number | null>(null);
  const resolved = useRef<string | null>(null);

  useEffect(() => {
    // A new id is a new request, even if the old one had resolved.
    anchored.current = null;
    resolved.current = null;
  }, [scrollToId]);

  useLayoutEffect(() => {
    if (scrollToId === null || resolved.current === scrollToId) return;

    const index = items.findIndex((item) => item.id === scrollToId);
    if (index < 0) {
      // A link to a row that is no longer in the list. Leaving the viewport
      // where it is and SAYING SO is the only honest outcome — scrolling to the
      // top would be indistinguishable from a successful landing.
      resolved.current = scrollToId;
      onScrollToIdResolved?.(scrollToId, false);

      return;
    }

    const vp = viewportRef.current;
    if (!vp) return;

    // Clamped the way the browser clamps: a row inside the final viewport-height
    // of the list cannot be brought to the top, and pretending otherwise would
    // leave this waiting for a position that can never be reached.
    const target = Math.max(0, Math.min(offsets[index], Math.max(0, total - viewport)));

    if (anchored.current !== target) {
      anchored.current = target;
      vp.scrollTop = target;
      setScrollTop(target);

      return;
    }

    // The target stopped moving as rows above it were measured, and we are on
    // it. Only now is the deep link actually honoured.
    if (Math.abs(vp.scrollTop - target) <= 1) {
      resolved.current = scrollToId;
      onScrollToIdResolved?.(scrollToId, true);
    }
  });

  // ------------------------------------------------------------- tail-follow

  const reportedFollow = useRef(followTail);
  const programmatic = useRef(false);

  useEffect(() => {
    // The prop is the truth, so adopt it rather than remembering what we asked
    // for. Otherwise a consumer that declines an `onFollowChange(false)` would
    // never be asked again.
    reportedFollow.current = followTail;
  }, [followTail]);

  const askFollow = useCallback(
    (next: boolean) => {
      if (reportedFollow.current === next) return;
      reportedFollow.current = next;
      onFollowChange?.(next);
    },
    [onFollowChange],
  );

  useLayoutEffect(() => {
    if (!followTail) return;
    // A pending deep link wins while it resolves; otherwise the two would fight
    // over the same scrollTop and the link would lose.
    if (scrollToId !== null && resolved.current !== scrollToId) return;

    const vp = viewportRef.current;
    if (!vp) return;

    const bottom = Math.max(0, total - viewport);
    if (Math.abs(vp.scrollTop - bottom) > 0.5) {
      programmatic.current = true;
      vp.scrollTop = bottom;
      setScrollTop(bottom);
    }
  });

  const onScroll = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const next = vp.scrollTop;
    const previous = scrollTop;
    setScrollTop(next);

    const bottom = Math.max(0, total - viewport);
    const wasProgrammatic = programmatic.current;
    programmatic.current = false;

    if (next <= bottom - BOTTOM_SLACK) {
      // Moved up, and not because we moved it.
      if (!wasProgrammatic && next < previous) askFollow(false);
    } else {
      askFollow(true);
    }
  }, [scrollTop, total, viewport, askFollow]);

  /** Any upward gesture is a statement of intent, whatever scrollTop says. */
  const onWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      if (e.deltaY < 0) askFollow(false);
    },
    [askFollow],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (UPWARD_KEYS.has(e.key)) askFollow(false);
    },
    [askFollow],
  );

  const touchStart = useRef<number | null>(null);

  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    touchStart.current = e.touches[0]?.clientY ?? null;
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      const from = touchStart.current;
      const y = e.touches[0]?.clientY;
      // Finger travelling DOWN drags the content down, which scrolls up.
      if (from !== null && y !== undefined && y - from > TOUCH_SLOP) askFollow(false);
    },
    [askFollow],
  );

  // ------------------------------------------------------------ unseen count

  const seen = useRef(items.length);
  const reportedUnseen = useRef<number | null>(null);

  useEffect(() => {
    const unseen = followTail ? 0 : Math.max(0, items.length - seen.current);
    if (followTail) seen.current = items.length;

    if (reportedUnseen.current === unseen) return;
    reportedUnseen.current = unseen;
    onUnseenChange?.(unseen);
  }, [items.length, followTail, onUnseenChange]);

  // ------------------------------------------------------------------ render

  return (
    <div
      ref={attachViewport}
      data-react-fancy-virtual-list=""
      data-react-fancy-virtual-list-following={followTail ? "true" : "false"}
      data-react-fancy-virtual-list-rows={items.length}
      role="log"
      tabIndex={0}
      className={cn("relative overflow-y-auto overflow-x-hidden outline-none", className)}
      style={{ height }}
      onScroll={onScroll}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      {...props}
    >
      {/* Holds the full scroll range so the scrollbar is honest from the first
          paint, instead of growing as rows are discovered. */}
      <div
        data-react-fancy-virtual-list-sizer=""
        style={{ height: `${total}px`, position: "relative" }}
      >
        <div
          ref={windowRef}
          data-react-fancy-virtual-list-window=""
          data-react-fancy-virtual-list-start={start}
          style={{ transform: `translateY(${offsets[start] ?? 0}px)` }}
        >
          {visible.map((item, i) => (
            <div key={item.id} data-react-fancy-virtual-row-id={item.id}>
              {renderRow(item, start + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ROW_ID_ATTR = "data-react-fancy-virtual-row-id";
/** Within this many px of the bottom counts as "at the bottom". */
const BOTTOM_SLACK = 4;
/** Ignore a touch jitter smaller than this before calling it an upward drag. */
const TOUCH_SLOP = 4;
const UPWARD_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);
