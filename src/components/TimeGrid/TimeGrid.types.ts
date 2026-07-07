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

export interface TimeGridProps {
  /** Row labels, one per row in `value` (e.g. ["Sun","Mon",…]). */
  rows: string[];
  /** Column labels, one per column in `value` (e.g. ["0","1",…,"23"]). */
  cols: string[];
  /**
   * Controlled cell state. Must be a rectangular `rows.length × cols.length`
   * matrix of booleans. The component never mutates it — every change
   * produces a new array passed to `onChange`.
   */
  value: boolean[][];
  /** Called with the next matrix whenever a cell, row, or column toggles. */
  onChange: (next: boolean[][]) => void;

  /** Cell-on tone. Default `"violet"`. */
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
  /** If true (default), clicking a row/column header toggles that strip. */
  toggleStripsOnHeaderClick?: boolean;

  /**
   * Optional accessible label per cell. Default produces
   * `${rows[r]} ${cols[c]} on|off`. Override for richer context
   * (e.g. include unit: `${rows[r]} ${cols[c]}:00 ${on ? "on" : "off"}`).
   */
  ariaCell?: (rowIdx: number, colIdx: number, on: boolean) => string;

  /**
   * Stable per-cell identifier. Emitted as `data-react-fancy-timegrid-cell`
   * on the button so MCP bridges can address a specific cell from a tool
   * call without DOM walking. Default `${row}:${col}`.
   */
  cellId?: (rowIdx: number, colIdx: number) => string;

  /** Additional CSS classes on the outer scroll container. */
  className?: string;
}
