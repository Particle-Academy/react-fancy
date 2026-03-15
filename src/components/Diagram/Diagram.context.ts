import { createContext, useContext } from "react";
import type { DiagramContextValue } from "./Diagram.types";

export const DiagramContext = createContext<DiagramContextValue | null>(null);

export function useDiagram(): DiagramContextValue {
  const ctx = useContext(DiagramContext);
  if (!ctx) {
    throw new Error("useDiagram must be used within a <Diagram> component");
  }
  return ctx;
}
