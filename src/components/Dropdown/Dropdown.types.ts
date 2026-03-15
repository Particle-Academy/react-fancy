import type { ReactNode } from "react";
import type { Placement } from "../../utils/types";

export interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  placement: Placement;
  offset: number;
}

export interface DropdownProps {
  children: ReactNode;
  placement?: Placement;
  offset?: number;
}

export interface DropdownTriggerProps {
  children: ReactNode;
}

export interface DropdownItemsProps {
  children: ReactNode;
  className?: string;
}

export interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

export interface DropdownSeparatorProps {
  className?: string;
}
