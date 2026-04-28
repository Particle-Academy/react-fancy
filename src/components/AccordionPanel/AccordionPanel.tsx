import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { AccordionPanelContext } from "./AccordionPanel.context";
import { AccordionPanelSection } from "./AccordionPanel.Section";
import { AccordionPanelTrigger } from "./AccordionPanel.Trigger";
import { AccordionPanelContent } from "./AccordionPanel.Content";
import type { AccordionPanelProps } from "./AccordionPanel.types";

/**
 * Horizontal or vertical accordion of collapsible sections.
 *
 * Use the compound parts:
 *   <AccordionPanel orientation="horizontal" defaultValue={["wishlist"]}>
 *     <AccordionPanel.Section id="home" pinned>
 *       <Action icon="home" />
 *     </AccordionPanel.Section>
 *     <AccordionPanel.Section id="wishlist">
 *       <Action icon="list">Wishlist</Action>
 *     </AccordionPanel.Section>
 *   </AccordionPanel>
 *
 * Each non-pinned section renders a trigger (default chevron-divider) that
 * collapses/expands. Pass a custom `trigger` prop on a Section, or use the
 * exported `AccordionPanel.Trigger` directly to compose your own.
 */
function AccordionPanelRoot({
  orientation = "horizontal",
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
  children,
}: AccordionPanelProps) {
  const [openIds, setOpenIds] = useControllableState<string[]>(
    controlledValue,
    defaultValue ?? [],
    onValueChange,
  );

  const openSet = useMemo(() => new Set(openIds), [openIds]);

  const isOpen = useCallback((id: string) => openSet.has(id), [openSet]);

  const open = useCallback(
    (id: string) => {
      setOpenIds(openSet.has(id) ? (openIds ?? []) : [...(openIds ?? []), id]);
    },
    [openSet, openIds, setOpenIds],
  );

  const close = useCallback(
    (id: string) => {
      setOpenIds((openIds ?? []).filter((x) => x !== id));
    },
    [openIds, setOpenIds],
  );

  const toggle = useCallback(
    (id: string) => {
      setOpenIds(
        openSet.has(id)
          ? (openIds ?? []).filter((x) => x !== id)
          : [...(openIds ?? []), id],
      );
    },
    [openSet, openIds, setOpenIds],
  );

  // Track section order for downstream consumers (e.g. trigger direction
  // heuristics that need to know neighbors).
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const orderRef = useRef<string[]>([]);

  const registerSection = useCallback((id: string) => {
    if (!orderRef.current.includes(id)) {
      orderRef.current = [...orderRef.current, id];
      setSectionIds(orderRef.current);
    }
    return () => {
      orderRef.current = orderRef.current.filter((x) => x !== id);
      setSectionIds(orderRef.current);
    };
  }, []);

  const ctx = useMemo(
    () => ({
      orientation,
      isOpen,
      toggle,
      open,
      close,
      sectionIds,
      registerSection,
    }),
    [orientation, isOpen, toggle, open, close, sectionIds, registerSection],
  );

  return (
    <AccordionPanelContext.Provider value={ctx}>
      <div
        data-react-fancy-accordion-panel=""
        data-orientation={orientation}
        className={cn(
          "inline-flex items-stretch",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPanelContext.Provider>
  );
}

AccordionPanelRoot.displayName = "AccordionPanel";

// ── Compound exports ────────────────────────────────────────────────────

type AccordionPanelType = typeof AccordionPanelRoot & {
  Section: typeof AccordionPanelSection;
  Trigger: typeof AccordionPanelTrigger;
  Content: typeof AccordionPanelContent;
};

export const AccordionPanel = AccordionPanelRoot as AccordionPanelType;
AccordionPanel.Section = AccordionPanelSection;
AccordionPanel.Trigger = AccordionPanelTrigger;
AccordionPanel.Content = AccordionPanelContent;
