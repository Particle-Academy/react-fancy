import type { HTMLAttributes, ReactNode, ReactElement } from "react";
import type { Placement } from "../../utils/types";

/**
 * Every attribute and handler the Tooltip does not use itself (`data-*`,
 * `aria-*`, `onClick`, `onKeyDown`, …) is forwarded to its child, and so is its
 * `ref`, so a Tooltip works as the child of `Dropdown.Trigger` or
 * `Popover.Trigger`. The child's own value wins on a clash; handlers run both,
 * the child's first. `className` is NOT forwarded: it styles the bubble; use
 * `triggerClassName` for the child.
 */
export interface TooltipProps
  extends Omit<HTMLAttributes<HTMLElement>, "content" | "children" | "className"> {
  children: ReactElement;
  content: ReactNode;
  /** Forwarded to the child, like every attribute the Tooltip does not use. */
  [key: `data-${string}`]: unknown;
  placement?: Placement;
  delay?: number;
  offset?: number;
  /** Classes for the tooltip bubble (not the trigger). */
  className?: string;
  /**
   * Classes for the child, the trigger element, joined in front of its own
   * `className`. A `Popover.Trigger` / `Dropdown.Trigger` around this Tooltip
   * passes its `className` here, so it styles the button and not the bubble.
   */
  triggerClassName?: string;
  /**
   * Name the tooltip in the trigger's `aria-describedby` while it is shown.
   * Default `true`. Turn it off only when the tooltip repeats words the
   * trigger's accessible name already carries, so they are not read twice.
   */
  describe?: boolean;
}
