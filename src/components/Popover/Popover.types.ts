import type { ReactNode } from "react";
import type { Placement } from "../../utils/types";

export interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement: Placement;
  offset: number;
}

export interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  offset?: number;
}

export interface PopoverTriggerProps {
  children: ReactNode;
  className?: string;
}

export interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}
