import { createContext, useContext } from "react";
import type { ModalContextValue } from "./Modal.types";

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("Modal compound components must be used within <Modal>");
  }
  return ctx;
}
