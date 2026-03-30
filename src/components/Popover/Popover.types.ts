import type { ReactNode } from "react";
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

export interface PopoverTriggerProps {
  children: ReactNode;
  className?: string;
}

export interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}
