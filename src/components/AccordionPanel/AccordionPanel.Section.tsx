import { useEffect, useMemo } from "react";
import { cn } from "../../utils/cn";
import {
  AccordionSectionContext,
  useAccordionPanel,
} from "./AccordionPanel.context";
import type { AccordionPanelSectionProps } from "./AccordionPanel.types";

/**
 * One collapsible section inside an AccordionPanel.
 *
 * Compose with `<AccordionPanel.Trigger>` and `<AccordionPanel.Content>`
 * children — Content renders only when open, Trigger always renders and
 * adapts its look by state. Children that are not Trigger/Content are
 * rendered as-is, regardless of state, so static decorations stay put.
 *
 * Pinned sections never collapse and don't need a Trigger.
 */
export function AccordionPanelSection({
  id,
  pinned = false,
  className,
  openClassName,
  closedClassName,
  unstyled,
  children,
}: AccordionPanelSectionProps) {
  const panel = useAccordionPanel();
  const { orientation, isOpen, toggle, registerSection } = panel;

  useEffect(() => registerSection(id), [id, registerSection]);

  const open = pinned || isOpen(id);

  const sectionCtx = useMemo(
    () => ({
      id,
      open,
      pinned,
      orientation,
      toggle: () => toggle(id),
    }),
    [id, open, pinned, orientation, toggle],
  );

  return (
    <AccordionSectionContext.Provider value={sectionCtx}>
      <div
        data-react-fancy-accordion-section=""
        data-state={open ? "open" : "closed"}
        data-pinned={pinned ? "" : undefined}
        data-orientation={orientation}
        className={cn(
          "flex shrink-0",
          !unstyled && "items-center gap-1",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          className,
          open ? openClassName : closedClassName,
        )}
      >
        {children}
      </div>
    </AccordionSectionContext.Provider>
  );
}

AccordionPanelSection.displayName = "AccordionPanelSection";
