import type { ReactNode } from "react";

/**
 * Subset of palette colors the TimeGrid offers for the "cell-on" tone —
 * small enough to keep the compiled CSS tight, broad enough to cover most
 * use cases.
 */
export type TimeGridTone =
  | "violet"
  | "emerald"
  | "sky"
  | "rose"
  | "amber"
  | "indigo"
  | "blue"
  | "zinc";

/**
 * One typed cell. The kit declares the SHAPE; the host declares the
 * vocabulary through `states` and `marks`.
 */
export type TimeGridCell = {
  /** A key of `states`. The exclusive dimension (open / closed / booked …). */
  state: string;
  /** Blocks selection. Distinct from a state that merely looks unavailable. */
  disabled?: boolean;
  /** Why — surfaced in the title, the cell's aria-description and `onBlockedSelect`. */
  reasons?: string[];
  /** Keys of `marks`. Overlays drawn on top of the state tone. Non-exclusive. */
  marks?: string[];
  /** Passed back verbatim in every callback. The kit never reads it. */
  meta?: unknown;
};

/** A state in the host's vocabulary. */
export type TimeGridStateDef = {
  /** Fill tone. Omit for the neutral surface (`--fancy-surface-muted`). */
  tone?: TimeGridTone;
  /** What a screen reader hears for this state. Default: the state id. */
  label?: string;
  /** Extra classes on every cell in this state — the host's own styling. */
  className?: string;
};

/** An overlay mark: a tone dot or an icon, plus the label a screen reader gets. */
export type TimeGridMarkDef = {
  tone?: TimeGridTone;
  /**
   * Drawn instead of the tone dot, in a 10px box — e.g. `<Icon name="lock" />`.
   * A node rather than an icon name on purpose: resolving names would make
   * TimeGrid import the whole Lucide set into every bundle that uses it.
   */
  icon?: ReactNode;
  label?: string;
};

/** A cell coordinate: row index, column index. */
export type TimeGridCoord = { r: number; c: number };

/**
 * Both shapes are real and they are NOT the same value:
 *
 * - `rectangle`: the same window across several rows — 09:00-17:00 Mon-Fri.
 *   Normalised so r1 <= r2 and c1 <= c2.
 * - `linear`: ONE continuous run in reading order (row-major), which may cross
 *   a row end and keep going — 23:54 Monday through 00:06 Tuesday. Normalised
 *   so `from` precedes `to`.
 */
export type TimeGridSelection =
  | { shape: "rectangle"; r1: number; c1: number; r2: number; c2: number }
  | { shape: "linear"; from: TimeGridCoord; to: TimeGridCoord };

export type TimeGridSelectionShape = TimeGridSelection["shape"];

/** What a range that crosses a disabled cell does. */
export type TimeGridDisabledRange = "clamp" | "refuse" | "span";

export type TimeGridBlockedCell = { r: number; c: number; reasons?: string[] };

export interface TimeGridProps {
  /** Row labels, one per row (e.g. ["Sun","Mon",…]). */
  rows: string[];
  /** Column labels, one per column (e.g. ["0","1",…,"23"]). */
  cols: string[];
  /**
   * Boolean grid: controlled cell state, a rectangular
   * `rows.length × cols.length` matrix. Ignored when `cells` is given.
   */
  value?: boolean[][];
  /** Boolean grid: called with the next matrix whenever a cell, row, or column toggles. */
  onChange?: (next: boolean[][]) => void;

  /** Boolean grid: cell-on tone. Default `"violet"`. */
  toneOn?: TimeGridTone;
  /** Cell width in px. Default `20`. */
  cellWidth?: number;
  /** Cell height in px. Default `16`. */
  cellHeight?: number;
  /**
   * If true (default), only every Nth column label is rendered to keep the
   * top axis legible at small `cellWidth`. Set false to show all labels.
   */
  sparseColLabels?: boolean;
  /**
   * If true (default), clicking a row/column header toggles that strip
   * (boolean grid) or selects it (typed grid).
   */
  toggleStripsOnHeaderClick?: boolean;

  /**
   * Optional accessible label per cell. Boolean grid default:
   * `${rows[r]} ${cols[c]} on|off`; `on` is the cell value. Typed grid default:
   * `${rows[r]} ${cols[c]} ${state label}[, mark labels]`; `on` is whether the
   * cell is selected.
   */
  ariaCell?: (rowIdx: number, colIdx: number, on: boolean) => string;

  /**
   * Stable per-cell identifier, emitted as `data-react-fancy-timegrid-cell` so
   * MCP bridges can address a specific cell without DOM walking. Default
   * `${row}:${col}`.
   */
  cellId?: (rowIdx: number, colIdx: number) => string;

  /** Additional CSS classes on the outer scroll container. */
  className?: string;

  /* ── typed grid (5.55.0) ─────────────────────────────────────────────── */

  /** Host's state vocabulary: id -> tone + label. Required with `cells`. */
  states?: Record<string, TimeGridStateDef>;
  /** Host's overlay vocabulary: id -> tone/icon + label. */
  marks?: Record<string, TimeGridMarkDef>;
  /**
   * Typed cells, `rows.length × cols.length`. When present the grid renders
   * these (with `states`) and `value`/`onChange` are ignored.
   */
  cells?: TimeGridCell[][];

  /** Which shape a drag / Shift+arrow produces. Default `"rectangle"`. */
  selectionShape?: TimeGridSelectionShape;
  /** Controlled selection. `null` = nothing selected. Omit for uncontrolled. */
  selection?: TimeGridSelection | null;
  /** `cells` arrive in SELECTION ORDER — row-major, so time order for a linear run. */
  onSelectionChange?: (next: TimeGridSelection | null, cells: TimeGridCell[]) => void;
  /** A drag ended, or Enter was pressed. Same arguments as `onSelectionChange`. */
  onSelectionCommit?: (selection: TimeGridSelection, cells: TimeGridCell[]) => void;
  /** What a range that crosses a disabled cell does. Default `"clamp"`. */
  disabledRange?: TimeGridDisabledRange;
  /** Fires when a selection was refused or clipped by disabled cells. */
  onBlockedSelect?: (blocked: TimeGridBlockedCell[]) => void;
  /** Hover, for a host-owned detail panel. `null, null` when the pointer leaves. */
  onCellHover?: (cell: TimeGridCell | null, at: TimeGridCoord | null) => void;
  /**
   * Typed grid: render only the columns in view (plus overscan). The column
   * tracks stay the full grid, so the scroll width never changes; each row's
   * first rendered cell is placed explicitly. Default: on above 500 columns. Cell ids,
   * selection and callbacks still cover every cell — they come from `cells`,
   * not the DOM — and keyboard focus or an out-of-view `selection` scrolls the
   * window to it.
   */
  windowColumns?: boolean;
  /** Accessible name of the grid (typed grid). */
  "aria-label"?: string;
}
