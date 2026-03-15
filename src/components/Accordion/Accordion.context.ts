import { createContext, useContext } from "react";
import type { AccordionContextValue } from "./Accordion.types";

export const AccordionContext = createContext<AccordionContextValue | null>(
  null,
);

export function useAccordion(): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error(
      "Accordion compound components must be used within <Accordion>",
    );
  }
  return ctx;
}

export const AccordionItemContext = createContext<string>("");

export function useAccordionItem(): string {
  return useContext(AccordionItemContext);
}
