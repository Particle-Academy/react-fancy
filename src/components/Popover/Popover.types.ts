import type { HTMLAttributes, ReactNode } from "react";
import type { Placement } from "../../utils/types";

export interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  floatingRef: React.RefObject<HTMLDivElement | null>;
  placement: Placement;
  offset: number;
  hover: boolean;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  /** The content panel's id, which the trigger's `aria-controls` names. */
  contentId: string;
  /** Popover.Content registers an `id` its caller passed, so the trigger names it. @internal */
  setContentId: (id: string | undefined) => void;
}

export interface PopoverProps {
  children: ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Placement of the popover relative to the trigger */
  placement?: Placement;
  /** Pixel offset from the trigger */
  offset?: number;
  /** Open on hover instead of click */
  hover?: boolean;
  /** Delay in ms before opening on hover. Default: 200 */
  hoverDelay?: number;
  /** Delay in ms before closing after hover leaves. Default: 300 */
  hoverCloseDelay?: number;
}

/**
 * The trigger merges onto its child (the focusable control) rather than
 * wrapping it, so attributes passed here (`aria-*`, `data-*`, `id`, `title`,
 * e.g. `aria-label` for an icon-only trigger) land on that child, filling only
 * what it leaves unset; `className` is joined. A child nothing can focus is
 * wrapped in a `<button>` (a `<span>` in `hover` mode) that takes them instead.
 * Popover-owned props (ref, onClick, aria-expanded / haspopup / controls)
 * always win over forwarded ones.
 */
export interface PopoverTriggerProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

/**
 * The content renders a `<div>` — it extends its attributes so consumers can
 * forward `aria-*`/`data-*`/`role`/`id` onto the floating panel. Consumer
 * `style` is merged under the Popover's positioning (left/top always win).
 */
export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
