import type { ReactNode } from "react";

export interface ContextMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  position: { x: number; y: number };
}

export interface ContextMenuProps {
  children: ReactNode;
}

export interface ContextMenuTriggerProps {
  children: ReactNode;
  className?: string;
}

export interface ContextMenuContentProps {
  children: ReactNode;
  className?: string;
}

export interface ContextMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

export interface ContextMenuSeparatorProps {
  className?: string;
}
