import type { HTMLAttributes, ReactNode, Ref } from "react";

/**
 * The one thing `VirtualList` requires of a row: a stable id.
 *
 * It is required rather than derived from the array index because every feature
 * here outlives a reindex — `scrollToId` resolves a deep link after rows have
 * been prepended, and a measured height must follow its row rather than its
 * position.
 */
export interface VirtualListRow {
  id: string;
}

export interface VirtualListProps<T extends VirtualListRow>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onScroll"> {
  /** The full list. Only the visible window is ever rendered. */
  items: readonly T[];
  /** Render one row. Called only for rows inside the window. */
  renderRow: (item: T, index: number) => ReactNode;
  /**
   * Height of the scroll viewport. A number is also used as the viewport height
   * for windowing before the element has been measured, so prefer one when you
   * know it — `"100%"` works, it just renders a conservative first window.
   */
  height?: number | string;
  /**
   * Seed height for rows that have not been measured yet. Only affects rows
   * never rendered: a row's real height replaces it the moment it is on screen.
   * Pick the common case, not the average.
   */
  estimateRowHeight?: number;
  /** Rows to render beyond each edge of the viewport. */
  overscan?: number;

  /**
   * Stick to the bottom as rows arrive. **Controlled** — this component never
   * flips it on its own, so an agent can read and write the follow state
   * through a bridge. Pair it with {@link onFollowChange}.
   */
  followTail?: boolean;
  /**
   * The list asking to change {@link followTail}: `false` the instant the human
   * scrolls up, `true` when they return to the bottom. Honour it by updating
   * your own state — until you do, nothing changes.
   */
  onFollowChange?: (following: boolean) => void;
  /**
   * How many rows have arrived since tail-following stopped. Drives a
   * `↓ n new` pill, which is yours to render. Always `0` while following.
   */
  onUnseenChange?: (count: number) => void;

  /**
   * Put the row with this id at the top of the viewport — the `?at=<rowId>`
   * deep link. Resolution is not instant for a row far down an unmeasured list:
   * the target settles as the rows above it are measured. See
   * {@link onScrollToIdResolved}.
   */
  scrollToId?: string | null;
  /**
   * Fired once the component has stopped moving for a given `scrollToId`.
   * `landed` is `false` when the id is not in `items` — a deep link to a pruned
   * row, which must be distinguishable from a successful scroll to the top.
   */
  onScrollToIdResolved?: (id: string, landed: boolean) => void;

  /** The scroll viewport element. */
  ref?: Ref<HTMLDivElement>;
}
