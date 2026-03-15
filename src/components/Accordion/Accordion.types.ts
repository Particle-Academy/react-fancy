import type { ReactNode } from "react";

export interface AccordionContextValue {
  openItems: string[];
  toggle: (value: string) => void;
  multiple: boolean;
}

export interface AccordionProps {
  children: ReactNode;
  type?: "single" | "multiple";
  defaultOpen?: string[];
  className?: string;
}

export interface AccordionItemProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
}

export interface AccordionContentProps {
  children: ReactNode;
  className?: string;
}
