import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { useAccordionSection } from "./AccordionPanel.context";

export interface AccordionPanelContentProps {
  children: ReactNode;
  className?: string;
  /**
   * Skip the default flex-row/flex-col + items-center + gap classes so the
   * consumer can lay out the open-state content however they want (e.g. a
   * full-height chat panel with header/scroll/input rows). The
   * `data-react-fancy-accordion-content` attribute and conditional render
   * (only when the section is open) are kept.
   */
  unstyled?: boolean;
}

/**
 * Wrapper for the open-state content of a Section. Renders its children
 * only when the parent Section is open; returns `null` otherwise.
 *
 * Use this so siblings of `<AccordionPanel.Trigger>` inside a section can
 * cleanly toggle in/out of the DOM.
 *
 * The default styling assumes an inline cluster — flex row (horizontal
 * orientation) or column (vertical), centered, with a small gap. For panel
 * use cases where the content needs full-bleed layout (chat panes, canvas
 * surfaces, etc.), pass `unstyled` and supply your own className.
 */
export function AccordionPanelContent({
  children,
  className,
  unstyled,
}: AccordionPanelContentProps) {
  const { open, orientation } = useAccordionSection();
  if (!open) return null;

  return (
    <div
      data-react-fancy-accordion-content=""
      data-orientation={orientation}
      className={cn(
        !unstyled && "flex items-center gap-1",
        !unstyled && (orientation === "horizontal" ? "flex-row" : "flex-col"),
        className,
      )}
    >
      {children}
    </div>
  );
}

AccordionPanelContent.displayName = "AccordionPanelContent";
