import type { ReactNode } from "react";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";
export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastContextValue {
  toasts: ToastData[];
  toast: (data: Omit<ToastData, "id">) => string;
  dismiss: (id: string) => void;
}

export interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export interface ToastItemProps {
  data: ToastData;
  onDismiss: (id: string) => void;
}
