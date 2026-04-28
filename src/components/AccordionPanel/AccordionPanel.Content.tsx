import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { useAccordionSection } from "./AccordionPanel.context";

export interface AccordionPanelContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for the open-state content of a Section. Renders its children
 * only when the parent Section is open; returns `null` otherwise.
 *
 * Use this so siblings of `<AccordionPanel.Trigger>` inside a section can
 * cleanly toggle in/out of the DOM. Layout style flows through the
 * `className` prop (defaults to a flex row/column matching orientation).
 */
export function AccordionPanelContent({
  children,
  className,
}: AccordionPanelContentProps) {
  const { open, orientation } = useAccordionSection();
  if (!open) return null;

  return (
    <div
      data-react-fancy-accordion-content=""
      data-orientation={orientation}
      className={cn(
        "flex items-center gap-1",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}

AccordionPanelContent.displayName = "AccordionPanelContent";
