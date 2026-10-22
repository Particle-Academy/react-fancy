import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";
import {
  resolveRange,
  rowSegment,
  sameSelection,
  selectionBetween,
  selectionCoords,
} from "./TimeGrid.selection";
import type {
  TimeGridCell,
  TimeGridCoord,
  TimeGridMarkDef,
  TimeGridProps,
  TimeGridSelection,
  TimeGridStateDef,
  TimeGridTone,
} from "./TimeGrid.types";

/* Literal class strings so Tailwind's scanner finds them in dist. */
const TONE_FILL: Record<TimeGridTone, string> = {
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  indigo: "bg-indigo-500",
  blue: "bg-blue-500",
  zinc: "bg-zinc-500",
};

/** A state with no tone: the neutral well, from the theme tokens. */
const NEUTRAL_FILL =
  "bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]";

const CELL_BASE = "relative m-px h-[var(--tg-cell-h)] w-[var(--tg-cell-w)] rounded-sm";
const CELL_ENABLED = "cursor-pointer hover:brightness-90 dark:hover:brightness-125";
const CELL_DISABLED = "cursor-not-allowed opacity-40";
/** Selected: a translucent focus-colour wash over the state's own tone, so both stay readable. */
const CELL_SELECTED =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-sm after:bg-[color:var(--fancy-focus,var(--color-blue-500))]/50 dark:after:bg-[color:var(--fancy-focus-dark,var(--color-blue-400))]/50";
/** The keyboard-focused cell, while the grid has focus. */
const CELL_ACTIVE =
  "z-10 outline-2 outline-offset-1 outline-[color:var(--fancy-text,var(--color-zinc-900))] dark:outline-[color:var(--fancy-text-dark,var(--color-zinc-100))]";

const MARK_DOT =
  "h-1.5 w-1.5 rounded-full ring-1 ring-[color:var(--fancy-surface,var(--color-white))] dark:ring-[color:var(--fancy-surface-dark,var(--color-zinc-900))]";

const HEADER_COL =
  "overflow-visible whitespace-nowrap text-[10px] leading-4 text-[color:var(--fancy-text-faint,var(--color-zinc-400))] dark:text-[color:var(--fancy-text-faint-dark,var(--color-zinc-500))]";
const HEADER_ROW =
  "whitespace-nowrap pr-1 text-right text-[10px] font-medium text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]";
const HEADER_HOVER =
  "cursor-pointer hover:text-[color:var(--fancy-text,var(--color-zinc-900))] dark:hover:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]";

const TOOLTIP =
  "pointer-events-none absolute z-20 max-w-xs rounded-md px-2 py-1 text-xs shadow-lg bg-[color:var(--fancy-text,var(--color-zinc-900))] text-[color:var(--fancy-surface,var(--color-white))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]";

// Bundlers replace `process.env.NODE_ENV` textually; without one, the
// reference throws and we read that as production.
declare const process: { env: Record<string, string | undefined> };

function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

const EMPTY = {} as Record<string, never>;
/** Windowing turns itself on above this many columns unless `windowColumns` says otherwise. */
const WINDOW_DEFAULT_ABOVE = 500;
const WINDOW_MIN_OVERSCAN = 16;
/** Columns per memoised cell chunk. The window moves in whole chunks. */
const CHUNK = 16;
const WINDOW_CHUNK = CHUNK;
const ROW_START = { gridColumnStart: 1 } as const;
const warnedStates = new Set<string>();
let warnedNoStates = false;

type Ctx = {
  baseId: string;
  rows: string[];
  cols: string[];
  states: Record<string, TimeGridStateDef>;
  marks: Record<string, TimeGridMarkDef>;
  stateClass: (state: string) => string;
  cellWidth: number;
  cellHeight: number;
  fns: RefObject<{
    cellId?: (r: number, c: number) => string;
    ariaCell?: (r: number, c: number, on: boolean) => string;
  }>;
};

const cellDomId = (baseId: string, r: number, c: number) => `${baseId}-${r}-${c}`;

function parseCoord(el: Element | null, baseId: string): TimeGridCoord | null {
  const id = el?.id;
  if (!id || !id.startsWith(baseId + "-")) return null;
  const m = /-(\d+)-(\d+)$/.exec(id);
  return m ? { r: Number(m[1]), c: Number(m[2]) } : null;
}

type RowProps = {
  ctx: Ctx;
  r: number;
  rowCells: TimeGridCell[];
  selStart: number;
  selEnd: number;
  /** Column of the keyboard-focused cell when it is in this row AND the grid has focus, else -1. */
  activeCol: number;
  onRowHeader?: (r: number) => void;
  /** Rendered column window, inclusive. The whole row when not windowed. */
  colStart: number;
  colEnd: number;
  windowed: boolean;
};

/**
 * A row renders as fixed 16-column chunks, each memoised on primitives. A
 * window shift mounts the chunks entering view and skips the rest; a selection
 * change re-renders only the chunks it touches. Before this, every shift
 * rebuilt every cell of every row (31d: p95 157 ms/frame scrolling at 4x CPU).
 */
const TypedRow = memo(function TypedRow({
  ctx,
  r,
  rowCells,
  selStart,
  selEnd,
  activeCol,
  onRowHeader,
  colStart,
  colEnd,
  windowed,
}: RowProps) {
  const out: ReactNode[] = [];
  out.push(
    <div
      key="h"
      role="rowheader"
      data-react-fancy-timegrid-row={r}
      style={windowed ? ROW_START : undefined}
      onClick={onRowHeader ? () => onRowHeader(r) : undefined}
      className={onRowHeader ? `${HEADER_ROW} ${HEADER_HOVER}` : HEADER_ROW}
    >
      {ctx.rows[r]}
    </div>,
  );
  if (colEnd >= colStart) {
    const k0 = Math.floor(colStart / CHUNK);
    const k1 = Math.floor(colEnd / CHUNK);
    for (let k = k0; k <= k1; k++) {
      const from = Math.max(k * CHUNK, colStart);
      const to = Math.min(k * CHUNK + CHUNK - 1, colEnd);
      const overlaps = selEnd >= from && selStart <= to;
      out.push(
        <CellChunk
          key={k}
          ctx={ctx}
          r={r}
          rowCells={rowCells}
          from={from}
          to={to}
          selStart={overlaps ? Math.max(selStart, from) : -1}
          selEnd={overlaps ? Math.min(selEnd, to) : -2}
          activeCol={activeCol >= from && activeCol <= to ? activeCol : -1}
          place={windowed && from === colStart}
          windowed={windowed}
        />,
      );
    }
  }
  return (
    <div role="row" className="contents">
      {out}
    </div>
  );
});

type ChunkProps = {
  ctx: Ctx;
  r: number;
  rowCells: TimeGridCell[];
  from: number;
  to: number;
  selStart: number;
  selEnd: number;
  activeCol: number;
  /** Place the first cell explicitly (the first rendered chunk of a windowed row). */
  place: boolean;
  windowed: boolean;
};

const CellChunk = memo(function CellChunk({
  ctx,
  r,
  rowCells,
  from,
  to,
  selStart,
  selEnd,
  activeCol,
  place,
  windowed,
}: ChunkProps) {
  const { baseId, rows, cols, states, marks, stateClass } = ctx;
  const { cellId, ariaCell } = ctx.fns.current;
  const out: ReactNode[] = [];
  for (let c = from; c <= to; c++) {
    const cell = rowCells?.[c];
    const state = cell?.state ?? "";
    const selected = c >= selStart && c <= selEnd;
    const reasons = cell?.reasons?.length ? cell.reasons.join(". ") : undefined;
    const markIds = cell?.marks;
    let label: string;
    if (ariaCell) {
      label = ariaCell(r, c, selected);
    } else {
      label = `${rows[r]} ${cols[c]} ${states[state]?.label ?? state}`;
      if (markIds?.length) label += ", " + markIds.map((m) => marks[m]?.label ?? m).join(", ");
    }
    let cls = stateClass(state) + " " + (cell?.disabled ? CELL_DISABLED : CELL_ENABLED);
    if (selected) cls += " " + CELL_SELECTED;
    if (c === activeCol) cls += " " + CELL_ACTIVE;
    out.push(
      <div
        key={c}
        id={cellDomId(baseId, r, c)}
        role="gridcell"
        aria-colindex={windowed ? c + 2 : undefined}
        // Windowed, the tracks stay the full grid; the row's first rendered
        // cell is placed and the rest flow after it.
        style={place && c === from ? { gridColumnStart: c + 2 } : undefined}
        data-react-fancy-timegrid-cell={cellId ? cellId(r, c) : `${r}:${c}`}
        data-state={state}
        data-marks={markIds?.length ? markIds.join(" ") : undefined}
        aria-selected={selected}
        aria-disabled={cell?.disabled ? true : undefined}
        aria-label={label}
        aria-description={reasons}
        title={reasons}
        className={cls}
      >
        {markIds?.length ? (
          <span aria-hidden className="pointer-events-none absolute right-0 top-0 flex gap-px">
            {markIds.map((m) => {
              const def = marks[m];
              return def?.icon ? (
                <span key={m} data-react-fancy-timegrid-mark={m} className="flex h-2.5 w-2.5 items-center justify-center [&>svg]:h-full [&>svg]:w-full">
                  {def.icon}
                </span>
              ) : (
                <span
                  key={m}
                  data-react-fancy-timegrid-mark={m}
                  className={`${MARK_DOT} ${def?.tone ? TONE_FILL[def.tone] : NEUTRAL_FILL}`}
                />
              );
            })}
          </span>
        ) : null}
      </div>,
    );
  }
  return out;
});

type Gesture = {
  anchor: TimeGridCoord;
  last: TimeGridCoord;
  selection: TimeGridSelection | null;
  blockedKey: string;
};

export const TypedTimeGrid = forwardRef<HTMLDivElement, TimeGridProps>(function TypedTimeGrid(
  {
    rows,
    cols,
    cells: cellsProp,
    states: statesProp,
    marks: marksProp,
    cellWidth = 20,
    cellHeight = 16,
    sparseColLabels = true,
    toggleStripsOnHeaderClick = true,
    ariaCell,
    cellId,
    className,
    selectionShape = "rectangle",
    selection: selectionProp,
    onSelectionChange,
    onSelectionCommit,
    disabledRange = "clamp",
    onBlockedSelect,
    onCellHover,
    windowColumns,
    "aria-label": ariaLabel,
  },
  ref,
) {
  if (!statesProp) {
    const msg =
      "TimeGrid: `cells` was given without `states`. Every cell names a state id, and with no " +
      "vocabulary there is no tone to draw it in. Pass `states={{ open: { tone: \"emerald\", label: \"Open\" }, … }}`.";
    if (isDev()) throw new Error(msg);
    if (!warnedNoStates) {
      warnedNoStates = true;
      console.error(msg);
    }
  }
  const states = statesProp ?? EMPTY;
  const marks = marksProp ?? EMPTY;
  const cells = cellsProp!;
  const nRows = rows.length;
  const nCols = cols.length;

  const baseId = useId();
  const outerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const setOuterRef = useMemo(() => composeRefs(ref, outerRef), [ref]);

  const controlled = selectionProp !== undefined;
  const [inner, setInner] = useState<TimeGridSelection | null>(null);
  const selection = controlled ? selectionProp : inner;

  const [active, setActive] = useState<TimeGridCoord>({ r: 0, c: 0 });
  const [focused, setFocused] = useState(false);
  const anchorRef = useRef<TimeGridCoord | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const hoverRef = useRef<string>("");

  /* ── column windowing ───────────────────────────────────────────────── */

  const pitchX = cellWidth + 2;
  const windowed = windowColumns ?? nCols > WINDOW_DEFAULT_ABOVE;
  // `null` until measured. Windowed, the first pass renders the frame with NO
  // cells (cheap to lay out, and identical on the server), measures, then
  // renders the real window once. Guessing a width instead cost a full extra
  // render + layout: 31d x 240 mounted slower windowed than not.
  //
  // The raw scroll metrics live in a ref; STATE holds only the chunk-snapped
  // window, so a scroll that stays inside it renders nothing at all.
  const metrics = useRef({ left: 0, width: 0, headerW: 0 });
  const [win, setWin] = useState<{ start: number; end: number } | null>(null);

  /** First / last column strictly in view, from the current metrics. */
  const visibleRange = useCallback((): [number, number] => {
    const { left, width, headerW } = metrics.current;
    const first = Math.max(0, Math.floor((left - headerW) / pitchX));
    const last = Math.min(nCols - 1, Math.max(first, Math.ceil((left + width - headerW) / pitchX)));
    return [first, last];
  }, [pitchX, nCols]);

  const measure = useCallback(() => {
    const el = outerRef.current;
    if (!el) return;
    const rh = el.querySelector<HTMLElement>('[role="rowheader"]');
    metrics.current = {
      left: el.scrollLeft,
      width: el.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1024),
      headerW: rh ? rh.offsetWidth + 2 : 0,
    };
    // Overscan a quarter viewport each side, snapped to chunks.
    const [first, last] = visibleRange();
    const over = Math.max(WINDOW_MIN_OVERSCAN, Math.ceil((last - first) / 4));
    const start = Math.max(0, Math.floor((first - over) / WINDOW_CHUNK) * WINDOW_CHUNK);
    const end = Math.min(nCols - 1, Math.ceil((last + over + 1) / WINDOW_CHUNK) * WINDOW_CHUNK - 1);
    setWin((w) => (w && w.start === start && w.end === end ? w : { start, end }));
  }, [visibleRange, nCols]);

  useLayoutEffect(() => {
    if (!windowed) return;
    measure();
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [windowed, measure]);

  // Applied synchronously: a jump (scrollbar click, a scrolled-to cell) must be
  // in the DOM before the browser paints, or the viewport flashes blank.
  const onScroll = useCallback(() => flushSync(measure), [measure]);

  let colStart = 0;
  let colEnd = nCols - 1;
  if (windowed) {
    // Unmeasured: the frame only, no cells.
    colStart = win ? win.start : 0;
    colEnd = win ? Math.min(win.end, nCols - 1) : -1;
  }

  /** Scroll so column `c` is in view (arithmetic: it may not be rendered yet). */
  const revealCol = useCallback(
    (c: number) => {
      const el = outerRef.current;
      if (!el) return;
      const { headerW } = metrics.current;
      const width = el.clientWidth || metrics.current.width;
      const x = headerW + c * pitchX;
      let left = el.scrollLeft;
      if (x < left + headerW) left = Math.max(0, x - headerW);
      else if (x + pitchX > left + width) left = x + pitchX - width;
      if (left !== el.scrollLeft) {
        el.scrollLeft = left;
        measure();
      }
    },
    [pitchX, measure],
  );

  // Latest values for handlers, so they stay stable across renders.
  const live = useRef({ cells, selection, selectionShape, disabledRange, onSelectionChange, onSelectionCommit, onBlockedSelect, onCellHover });
  live.current = { cells, selection, selectionShape, disabledRange, onSelectionChange, onSelectionCommit, onBlockedSelect, onCellHover };

  const fns = useRef<Ctx["fns"]["current"]>({});
  fns.current = { cellId, ariaCell };

  const stateClass = useMemo(() => {
    const cache = new Map<string, string>();
    return (state: string) => {
      let cls = cache.get(state);
      if (cls !== undefined) return cls;
      const def = states[state];
      if (!def && statesProp && !warnedStates.has(state)) {
        warnedStates.add(state);
        console.warn(`TimeGrid: unknown state id "${state}" — not a key of \`states\`. Rendering it neutral.`);
      }
      cls = `${CELL_BASE} ${def?.tone ? TONE_FILL[def.tone] : NEUTRAL_FILL}${def?.className ? " " + def.className : ""}`;
      cache.set(state, cls);
      return cls;
    };
  }, [states, statesProp]);

  const ctx = useMemo<Ctx>(
    () => ({ baseId, rows, cols, states, marks, stateClass, cellWidth, cellHeight, fns }),
    [baseId, rows, cols, states, marks, stateClass, cellWidth, cellHeight],
  );

  /* ── selection plumbing ─────────────────────────────────────────────── */

  const isDisabled = useCallback(
    (r: number, c: number) => !!live.current.cells[r]?.[c]?.disabled,
    [],
  );

  const cellsOf = useCallback(
    (sel: TimeGridSelection | null) =>
      selectionCoords(sel, nRows, nCols).map(({ r, c }) => live.current.cells[r]?.[c]),
    [nRows, nCols],
  );

  const emit = useCallback(
    (next: TimeGridSelection | null) => {
      if (!controlled) setInner(next);
      live.current.onSelectionChange?.(next, cellsOf(next));
    },
    [controlled, cellsOf],
  );

  const reportBlocked = useCallback((blocked: TimeGridCoord[], g: Gesture | null) => {
    if (!blocked.length) return;
    const key = blocked.map((b) => `${b.r}:${b.c}`).join(",");
    if (g) {
      if (g.blockedKey === key) return;
      g.blockedKey = key;
    }
    live.current.onBlockedSelect?.(
      blocked.map(({ r, c }) => {
        const reasons = live.current.cells[r]?.[c]?.reasons;
        return reasons ? { r, c, reasons } : { r, c };
      }),
    );
  }, []);

  /** Apply anchor -> target under the policy. Returns the selection now in force for this gesture. */
  const extend = useCallback(
    (
      anchor: TimeGridCoord,
      target: TimeGridCoord,
      g: Gesture | null,
      shape = live.current.selectionShape,
    ): TimeGridSelection | null | undefined => {
      const res = resolveRange(shape, anchor, target, nRows, nCols, isDisabled, live.current.disabledRange);
      reportBlocked(res.blocked, g);
      if (res.kind === "refuse") return undefined;
      const current = g ? g.selection : live.current.selection;
      if (!sameSelection(current, res.selection) || (g && g.selection === null)) emit(res.selection);
      return res.selection;
    },
    [nRows, nCols, isDisabled, reportBlocked, emit],
  );

  const commit = useCallback(
    (sel: TimeGridSelection | null) => {
      if (sel) live.current.onSelectionCommit?.(sel, cellsOf(sel));
    },
    [cellsOf],
  );

  /* ── pointer ────────────────────────────────────────────────────────── */

  /**
   * Outside every cell (a captured drag past the grid's edge): the nearest cell
   * by geometry, measured from the first and last RENDERED cell's boxes, so it
   * holds when the grid is windowed.
   */
  const clampToGrid = useCallback(
    (x: number, y: number): TimeGridCoord | null => {
      const first = document.getElementById(cellDomId(baseId, 0, colStart));
      const last = document.getElementById(cellDomId(baseId, nRows - 1, colEnd));
      if (!first || !last) return null;
      const a = first.getBoundingClientRect();
      const b = last.getBoundingClientRect();
      const w = (b.right - a.left) / (colEnd - colStart + 1);
      const h = (b.bottom - a.top) / nRows;
      if (!(w > 0) || !(h > 0)) return null;
      return {
        r: Math.min(nRows - 1, Math.max(0, Math.floor((y - a.top) / h))),
        c: Math.min(nCols - 1, Math.max(0, colStart + Math.floor((x - a.left) / w))),
      };
    },
    [baseId, nRows, nCols, colStart, colEnd],
  );

  const coordFromEvent = useCallback(
    (e: ReactPointerEvent): TimeGridCoord | null => {
      const t = e.target as Element;
      let hit = parseCoord(t?.closest?.('[role="gridcell"]') ?? null, baseId);
      if (!hit && typeof document.elementFromPoint === "function") {
        const under = document.elementFromPoint(e.clientX, e.clientY);
        hit = parseCoord(under?.closest?.('[role="gridcell"]') ?? null, baseId);
      }
      if (!hit) hit = clampToGrid(e.clientX, e.clientY);
      return hit;
    },
    [baseId, clampToGrid],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const at = coordFromEvent(e);
    if (!at) return;
    e.preventDefault();
    gridRef.current?.focus({ preventScroll: true });
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* jsdom / synthetic pointers */
    }
    setActive(at);
    const g: Gesture = { anchor: at, last: at, selection: null, blockedKey: "" };
    const sel = extend(at, at, g);
    if (sel === undefined) {
      gestureRef.current = null;
      return;
    }
    g.selection = sel;
    anchorRef.current = at;
    gestureRef.current = g;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g) return;
    const at = coordFromEvent(e);
    if (!at || (at.r === g.last.r && at.c === g.last.c)) return;
    g.last = at;
    setActive(at);
    const sel = extend(g.anchor, at, g);
    if (sel !== undefined) g.selection = sel;
  };

  const endGesture = () => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (g) commit(g.selection);
  };

  const onPointerOver = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!live.current.onCellHover) return;
    const at = parseCoord((e.target as Element)?.closest?.('[role="gridcell"]') ?? null, baseId);
    if (!at) return;
    const key = `${at.r}:${at.c}`;
    if (hoverRef.current === key) return;
    hoverRef.current = key;
    live.current.onCellHover(live.current.cells[at.r]?.[at.c] ?? null, at);
  };

  const onPointerLeave = () => {
    if (!hoverRef.current) return;
    hoverRef.current = "";
    live.current.onCellHover?.(null, null);
  };

  /* ── keyboard: the grid holds focus; aria-activedescendant names the cell ── */

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const move: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const d = move[e.key];
    if (d) {
      e.preventDefault();
      const next = {
        r: Math.min(nRows - 1, Math.max(0, active.r + d[0])),
        c: Math.min(nCols - 1, Math.max(0, active.c + d[1])),
      };
      setActive(next);
      if (e.shiftKey) {
        const anchor = anchorRef.current ?? active;
        anchorRef.current = anchor;
        extend(anchor, next, null);
      }
      return;
    }
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      const sel = live.current.selection;
      const single = selectionBetween(live.current.selectionShape, active, active, nCols);
      if (sel && sameSelection(sel, single)) {
        anchorRef.current = null;
        emit(null);
      } else {
        const res = extend(active, active, null);
        if (res !== undefined) anchorRef.current = active;
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      let sel = live.current.selection ?? null;
      if (!sel) {
        const res = extend(active, active, null);
        if (res === undefined) return;
        anchorRef.current = active;
        sel = res;
      }
      commit(sel);
      return;
    }
    if (e.key === "Escape") {
      if (live.current.selection) {
        e.preventDefault();
        anchorRef.current = null;
        emit(null);
      }
    }
  };

  /* ── header strips: select a whole row / column ─────────────────────── */

  const pickStrip = useCallback(
    (a: TimeGridCoord, b: TimeGridCoord) => {
      anchorRef.current = a;
      setActive(a);
      const sel = extend(a, b, null, "rectangle");
      if (sel) commit(sel);
    },
    [extend, commit],
  );
  const onRowHeader = useMemo(
    () => (toggleStripsOnHeaderClick ? (r: number) => pickStrip({ r, c: 0 }, { r, c: nCols - 1 }) : undefined),
    [toggleStripsOnHeaderClick, pickStrip, nCols],
  );

  /* ── focus tooltip for reasons ──────────────────────────────────────── */

  const activeCell = cells[active.r]?.[active.c];
  const activeReasons = focused && activeCell?.reasons?.length ? activeCell.reasons.join(". ") : null;
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!activeReasons) return;
    const outer = outerRef.current;
    const el = document.getElementById(cellDomId(baseId, active.r, active.c));
    if (!outer || !el) return;
    const o = outer.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    setTipPos({ left: b.left - o.left + outer.scrollLeft, top: b.bottom - o.top + outer.scrollTop + 4 });
  }, [activeReasons, active.r, active.c, baseId]);

  const reveal = useRef({ revealCol, windowed: windowed && !!win, visibleRange });
  reveal.current = { revealCol, windowed: windowed && !!win, visibleRange };

  // Keep the active cell in view when the keyboard moves it. Windowed, the
  // cell may not exist yet, so scroll by arithmetic and let the window follow.
  useEffect(() => {
    if (!focused) return;
    if (reveal.current.windowed) {
      reveal.current.revealCol(active.c);
      return;
    }
    const el = document.getElementById(cellDomId(baseId, active.r, active.c));
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [focused, active.r, active.c, baseId]);

  // A selection set from outside (a host, an agent through a bridge) that is
  // entirely out of view is scrolled to, so what was selected can be seen.
  useEffect(() => {
    const { windowed: w, visibleRange: vr, revealCol: rc } = reveal.current;
    if (!w || !selection || gestureRef.current) return;
    const [f, l] = vr();
    let s0: number;
    let s1: number;
    if (selection.shape === "rectangle") {
      s0 = selection.c1;
      s1 = selection.c2;
    } else if (selection.from.r === selection.to.r) {
      s0 = selection.from.c;
      s1 = selection.to.c;
    } else return;
    if (s1 < f || s0 > l) rc(s0);
  }, [selection]);

  const colStep = Math.max(1, Math.floor(nCols / 6));
  const tipId = `${baseId}-tip`;

  const bodyRows = new Array(nRows);
  for (let r = 0; r < nRows; r++) {
    const seg = rowSegment(selection, r, nCols);
    bodyRows[r] = (
      <TypedRow
        key={r}
        ctx={ctx}
        r={r}
        rowCells={cells[r]}
        selStart={seg ? seg[0] : -1}
        selEnd={seg ? seg[1] : -2}
        activeCol={focused && active.r === r ? active.c : -1}
        onRowHeader={onRowHeader}
        colStart={colStart}
        colEnd={colEnd}
        windowed={windowed}
      />
    );
  }

  // Fixed for the life of the grid, windowed or not: changing the tracks on a
  // window shift re-lays out every item, every frame of a scroll.
  const gridTemplateColumns = `max-content repeat(${nCols}, ${pitchX}px)`;
  const headerCols: ReactNode[] = [];
  for (let c = colStart; c <= colEnd; c++) {
    headerCols.push(
      <div
        key={c}
        role="columnheader"
        aria-colindex={windowed ? c + 2 : undefined}
        style={windowed && c === colStart ? { gridColumnStart: c + 2 } : undefined}
        data-react-fancy-timegrid-col={c}
        onClick={toggleStripsOnHeaderClick ? () => pickStrip({ r: 0, c }, { r: nRows - 1, c }) : undefined}
        className={toggleStripsOnHeaderClick ? `${HEADER_COL} ${HEADER_HOVER}` : HEADER_COL}
      >
        {sparseColLabels ? (c % colStep === 0 ? cols[c] : "") : cols[c]}
      </div>,
    );
  }

  return (
    <div
      ref={setOuterRef}
      data-react-fancy-timegrid=""
      data-typed=""
      data-windowed={windowed ? "" : undefined}
      onScroll={windowed ? onScroll : undefined}
      className={cn("relative select-none overflow-x-auto", className)}
    >
      <div
        ref={gridRef}
        role="grid"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-multiselectable="true"
        aria-rowcount={nRows + 1}
        aria-colcount={nCols + 1}
        aria-activedescendant={cellDomId(baseId, active.r, active.c)}
        aria-describedby={activeReasons ? tipId : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onPointerOver={onPointerOver}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="inline-grid touch-none items-center outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))]/40 dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]/20"
        style={
          {
            gridTemplateColumns,
            "--tg-cell-w": `${cellWidth}px`,
            "--tg-cell-h": `${cellHeight}px`,
          } as CSSProperties
        }
      >
        <div role="row" className="contents">
          <div role="columnheader" />
          {headerCols}
        </div>
        {bodyRows}
      </div>
      {activeReasons ? (
        <div
          id={tipId}
          role="tooltip"
          data-react-fancy-timegrid-tooltip=""
          className={TOOLTIP}
          style={tipPos ? { left: tipPos.left, top: tipPos.top } : undefined}
        >
          {activeReasons}
        </div>
      ) : null}
    </div>
  );
});
