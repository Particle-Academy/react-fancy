import type { ReactNode } from "react";

export interface AccordionContextValue {
  openItems: string[];
  toggle: (value: string) => void;
  multiple: boolean;
}

interface AccordionBaseProps {
  children: ReactNode;
  /**
   * Items that start open, uncontrolled. Kept for compatibility; prefer
   * `defaultValue`, which takes the same shape as `value`.
   * @default []
   */
  defaultOpen?: string[];
  className?: string;
}

/** One item open at a time. The value is the open item's `value`, or `null`. */
export interface AccordionSingleProps extends AccordionBaseProps {
  type?: "single";
  /** Controlled: the open item's `value`, or `null` for none. */
  value?: string | null;
  /** Uncontrolled initial value. */
  defaultValue?: string | null;
  /** Called with the next value whenever an item opens or closes. */
  onChange?: (value: string | null) => void;
}

/** Any number of items open. The value is the open items' `value`s, in the order they opened. */
export interface AccordionMultipleProps extends AccordionBaseProps {
  type: "multiple";
  /** Controlled: the open items' `value`s. */
  value?: string[];
  /** Uncontrolled initial value. */
  defaultValue?: string[];
  /** Called with the next value whenever an item opens or closes. */
  onChange?: (value: string[]) => void;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

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
