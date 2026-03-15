import type { ReactNode } from "react";

export interface ModalContextValue {
  open: boolean;
  close: () => void;
}

export interface ModalProps {
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
