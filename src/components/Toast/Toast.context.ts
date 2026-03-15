import { createContext, useContext } from "react";
import type { ToastContextValue } from "./Toast.types";

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <Toast.Provider>");
  }
  return ctx;
}
