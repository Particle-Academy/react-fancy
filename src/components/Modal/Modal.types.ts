import type { HTMLAttributes, ReactNode } from "react";

export interface ModalContextValue {
  open: boolean;
  close: () => void;
  /** The id `Modal.Header` gives its title, which names the dialog. */
  titleId: string;
  /** Called by `Modal.Header` while it is mounted; returns the unregister. */
  registerTitle: () => () => void;
}

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /**
   * Keep the children mounted while closed. Default `false`: the modal
   * unmounts its children on close.
   *
   * When `true`, a closed modal stays in the tree `hidden`, `inert` and
   * `aria-hidden`: not painted, focusable or announced, but its children keep
   * their state and DOM identity. Focus trap, scroll lock and Escape still
   * apply only while open. Same contract as `Drawer`'s `keepMounted`.
   */
  keepMounted?: boolean;
  className?: string;
}

export interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
  /** Accessible name of the close button. Default `"Close"`; pass your locale's word. */
  closeLabel?: string;
}

export interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}
