import type { HTMLAttributes, ReactNode } from "react";

/** The least an item needs. Anything else on it is yours, and reaches `renderItem` untouched. */
export interface ReorderableGridItem {
  /** Stable id. The order is reported as these. */
  id: string;
  /**
   * Pinned: this cell keeps its slot. It cannot be picked up or dragged, and
   * nothing can be dropped onto it; other cells flow around it.
   */
  locked?: boolean;
}

/** What `renderItem` gets alongside the item. */
export interface ReorderableGridItemState {
  /** 0-based index in the order currently shown (the live preview while dragging). */
  index: number;
  /** 1-based position. */
  position: number;
  /** 1-based row. */
  row: number;
  /** 1-based column. */
  column: number;
  total: number;
  /** Being dragged with a pointer. */
  dragging: boolean;
  /** Picked up with the keyboard. */
  pickedUp: boolean;
  /** This cell's slot is where the active item will land. */
  dropTarget: boolean;
  locked: boolean;
  disabled: boolean;
  /**
   * Spread on an element to make it the drag handle. Once a cell contains a
   * handle, only the handle starts a pointer drag; without one, the whole cell
   * does. The keyboard always works on the cell itself.
   */
  handleProps: { "data-reorderable-handle": "" };
}

/** Facts every announcement can use. Positions are 1-based. */
export interface ReorderableGridAnnouncementContext {
  id: string;
  /** From `getItemLabel`, else `item.label` when it is a string, else the id. */
  label: string;
  position: number;
  total: number;
  row: number;
  column: number;
}

/** Every string the grid speaks or shows to assistive tech. Override any of them (i18n). */
export interface ReorderableGridLabels {
  /** Read with each cell (`aria-describedby`). */
  instructions: string;
  /** `aria-roledescription` of each cell. */
  roleDescription: string;
  pickedUp: (ctx: ReorderableGridAnnouncementContext) => string;
  moved: (ctx: ReorderableGridAnnouncementContext) => string;
  dropped: (ctx: ReorderableGridAnnouncementContext) => string;
  /** `ctx` is the restored (original) position. */
  cancelled: (ctx: ReorderableGridAnnouncementContext) => string;
  locked: (ctx: ReorderableGridAnnouncementContext) => string;
}

export interface ReorderableGridProps<T extends ReorderableGridItem>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange"> {
  /** The cells' data. Each needs a unique `id`. */
  items: T[];
  /**
   * Controlled order, as ids. Ids that are not in `items` are ignored, and
   * items missing from it follow in `items` order, so a stale or partial order
   * never drops a cell.
   */
  value?: string[];
  /** Uncontrolled starting order. Omit both to start in `items` order. */
  defaultValue?: string[];
  /**
   * The full new order, once per committed move: a pointer release or a
   * keyboard drop that changed something. Never on a cancel, never on a
   * no-op drop, never during the live preview.
   */
  onReorder?: (ids: string[]) => void;
  /** Renders a cell's content. Default: the item's label. */
  renderItem?: (item: T, state: ReorderableGridItemState) => ReactNode;
  /** Columns, 1 to 12. Placement is row-major. Default `2`. */
  columns?: number;
  /** Gutter. Default `sm`. */
  gap?: "none" | "sm" | "md" | "lg";
  /** No reordering at all, and no tab stops. */
  disabled?: boolean;
  /** Accessible name of the grid. */
  label?: string;
  /** The name an item is announced by. */
  getItemLabel?: (item: T) => string;
  /** Overrides for any announcement or label. */
  labels?: Partial<ReorderableGridLabels>;
  /** Skip the cell's default visuals (border, surface, padding). Behaviour stays. */
  unstyled?: boolean;
  /** Extra classes on every cell. */
  cellClassName?: string;
}
