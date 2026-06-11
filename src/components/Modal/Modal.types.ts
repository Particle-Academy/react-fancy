import type { HTMLAttributes, ReactNode } from "react";

export interface ModalContextValue {
  open: boolean;
  close: () => void;
}

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

export interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}
