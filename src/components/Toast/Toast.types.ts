import type { ReactNode } from "react";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";
export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

/** A single control offered inside a toast — typically "Undo". */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  /**
   * Auto-dismiss delay in ms. `0` (or less) never dismisses.
   *
   * Defaults to 5000 — but to 0 when `action` is set, because expiring the
   * offer is the same bug as making undo a timeout. Pass a number to opt back in.
   */
  duration?: number;
  /**
   * An action the toast offers, rendered as a real button.
   *
   * Undo has to be a control rather than a countdown: a timeout makes the safety
   * of an action depend on how fast someone reads, which is worst for exactly
   * the people who need undo most.
   */
  action?: ToastAction;
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
