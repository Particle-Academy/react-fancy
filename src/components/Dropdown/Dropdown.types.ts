import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
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
  /** The menu element's id, which the trigger's `aria-controls` names. */
  menuId: string;
}

export interface DropdownProps {
  children: ReactNode;
  placement?: Placement;
  offset?: number;
}

/**
 * `className` is joined onto the child's (with a Tooltip child, onto the
 * element the Tooltip wraps). Other attributes fill only what the child leaves
 * unset, as on `Popover.Trigger`.
 */
export interface DropdownTriggerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export interface DropdownItemsProps {
  children: ReactNode;
  className?: string;
}

/**
 * The item renders a `<button role="menuitem">`. Other button attributes
 * (`data-*`, `id`, `aria-*`, `title`, ...) are forwarded onto it, so an item
 * can carry a stable handle. The item's own `type`, `role`, `disabled`,
 * `aria-disabled`, marker and click handling always win over forwarded ones.
 */
export interface DropdownItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children" | "disabled" | "className"> {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

export interface DropdownSeparatorProps {
  className?: string;
}
