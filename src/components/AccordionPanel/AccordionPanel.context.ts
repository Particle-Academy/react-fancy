import { createContext, useContext } from "react";
import type { AccordionOrientation } from "./AccordionPanel.types";

// ── Panel-level context ─────────────────────────────────────────────────

export interface AccordionPanelContextValue {
  orientation: AccordionOrientation;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  open: (id: string) => void;
  close: (id: string) => void;
  /** Ordered list of all section ids registered in this panel */
  sectionIds: string[];
  registerSection: (id: string) => () => void;
}

export const AccordionPanelContext =
  createContext<AccordionPanelContextValue | null>(null);

export function useAccordionPanel(): AccordionPanelContextValue {
  const ctx = useContext(AccordionPanelContext);
  if (!ctx) {
    throw new Error(
      "AccordionPanel components must be used inside <AccordionPanel>",
    );
  }
  return ctx;
}

// ── Section-level context ───────────────────────────────────────────────

export interface AccordionSectionContextValue {
  id: string;
  open: boolean;
  pinned: boolean;
  orientation: AccordionOrientation;
  toggle: () => void;
}

export const AccordionSectionContext =
  createContext<AccordionSectionContextValue | null>(null);

export function useAccordionSection(): AccordionSectionContextValue {
  const ctx = useContext(AccordionSectionContext);
  if (!ctx) {
    throw new Error(
      "<AccordionPanel.Trigger> must be rendered inside <AccordionPanel.Section>",
    );
  }
  return ctx;
}
