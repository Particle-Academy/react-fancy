import type { HTMLAttributes, ReactNode } from "react";

/**
 * How the two PANELS are laid out.
 *
 * - `"horizontal"`: side by side. The separator is a vertical bar
 *   (`aria-orientation="vertical"`), moved with ArrowLeft / ArrowRight.
 * - `"vertical"`: stacked. The separator is a horizontal bar
 *   (`aria-orientation="horizontal"`), moved with ArrowUp / ArrowDown.
 */
export type ResizablePanelsOrientation = "horizontal" | "vertical";

export interface ResizablePanelsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange"> {
  /**
   * Exactly two children: the PRIMARY panel (first, left / top) and the
   * secondary panel (second, right / bottom). Further children are ignored.
   */
  children: ReactNode;
  /**
   * Controlled size of the primary panel, as a PERCENTAGE (0-100) of the
   * container. Clamped to `min` / `max`.
   */
  value?: number;
  /** Uncontrolled starting size, a percentage. Default `50`. */
  defaultValue?: number;
  /** Fires on every change while dragging or pressing keys. */
  onValueChange?: (value: number) => void;
  /**
   * Fires ONCE when a gesture ends: at pointer release (or cancel) and at key
   * release, and only if the value changed. This is the moment to persist a
   * per-user size; the host owns persistence.
   */
  onValueCommit?: (value: number) => void;
  /** Smallest primary size, a percentage. Default `10`. */
  min?: number;
  /** Largest primary size, a percentage. Default `90`. */
  max?: number;
  /** Panel layout. Default `"horizontal"` (side by side). */
  orientation?: ResizablePanelsOrientation;
  /** Arrow-key step, in percentage points. Default `5`. */
  step?: number;
  /** Shift + Arrow step, in percentage points. Default `20`. */
  largeStep?: number;
  /** Accessible name of the separator. Default `"Resize panels"`. */
  label?: string;
  /** Freezes the split: the separator is not focusable and ignores input. */
  disabled?: boolean;
}
