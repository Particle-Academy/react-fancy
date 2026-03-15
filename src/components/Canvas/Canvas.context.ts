import { createContext, useContext } from "react";
import type { CanvasContextValue } from "./Canvas.types";

export const CanvasContext = createContext<CanvasContextValue | null>(null);

export function useCanvas(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used within a Canvas component");
  return ctx;
}
