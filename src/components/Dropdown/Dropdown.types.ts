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
  /**
   * Which item the menu focuses when it next mounts: set by the trigger when
   * the menu is opened from the keyboard, consumed by `Dropdown.Items`.
   * @internal
   */
  pendingFocusRef: React.MutableRefObject<"first" | "last" | null>;
  /** The open menu element, or null while closed. @internal */
  menuRef: React.MutableRefObject<HTMLElement | null>;
  /** Move focus back to the trigger (its first focusable element). */
  focusTrigger: () => void;
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
