import { cn } from "../../utils/cn";
import { useAccordionSection } from "./AccordionPanel.context";
import type {
  AccordionPanelTriggerProps,
  SectionRenderable,
  SectionRenderState,
} from "./AccordionPanel.types";

function renderSlot(slot: SectionRenderable, state: SectionRenderState) {
  return typeof slot === "function" ? slot(state) : slot;
}

/**
 * Trigger for an AccordionPanel.Section.
 *
 * Has two visual roles, picked automatically from section state:
 *
 *   - When the section is OPEN: renders as a thin divider on the section's
 *     trailing edge. Hovering reveals an inset chevron pointing toward the
 *     section so the user knows clicking will collapse it.
 *
 *   - When the section is CLOSED: renders as a standalone chevron button
 *     in place of the section content. Clicking re-expands the section.
 *
 * Supply `children` (node or render-prop) to fully replace the default
 * rendering. The render-prop receives `{ open, toggle, orientation, id }`.
 */
export function AccordionPanelTrigger({
  children,
  className,
  "aria-label": ariaLabel,
}: AccordionPanelTriggerProps) {
  const { id, open, orientation, toggle } = useAccordionSection();
  const state: SectionRenderState = { id, open, orientation, toggle };

  // Custom render path — caller is in charge of look & feel.
  if (children !== undefined) {
    return (
      <div
        data-react-fancy-accordion-trigger=""
        data-state={open ? "open" : "closed"}
        data-orientation={orientation}
        className={className}
      >
        {renderSlot(children, state)}
      </div>
    );
  }

  // Default rendering ----------------------------------------------------

  if (open) {
    // Trailing-edge divider. Click to collapse the section. Hover reveals
    // a chevron pointing back toward the content that will disappear.
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={ariaLabel ?? "Collapse section"}
        data-react-fancy-accordion-trigger=""
        data-state="open"
        data-orientation={orientation}
        className={cn(
          "group relative flex shrink-0 items-center justify-center cursor-pointer",
          "text-zinc-500 dark:text-zinc-500",
          "hover:text-zinc-900 dark:hover:text-zinc-100",
          orientation === "horizontal"
            ? "w-px self-stretch hover:w-3 mx-1"
            : "h-px self-stretch hover:h-3 my-1",
          "before:absolute before:inset-0 before:bg-zinc-200 dark:before:bg-zinc-700",
          orientation === "horizontal"
            ? "before:w-px before:left-1/2 before:-translate-x-1/2"
            : "before:h-px before:top-1/2 before:-translate-y-1/2",
          "transition-all duration-150",
          className,
        )}
      >
        <ChevronIcon
          orientation={orientation}
          purpose="collapse"
          className="relative opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </button>
    );
  }

  // Closed: standalone chevron button. Click to re-expand.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaLabel ?? "Expand section"}
      data-react-fancy-accordion-trigger=""
      data-state="closed"
      data-orientation={orientation}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        "text-zinc-400 dark:text-zinc-500",
        "hover:text-zinc-900 dark:hover:text-zinc-100",
        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        "transition-colors cursor-pointer",
        orientation === "horizontal" ? "h-8 w-6 mx-0.5" : "w-8 h-6 my-0.5",
        className,
      )}
    >
      <ChevronIcon orientation={orientation} purpose="expand" />
    </button>
  );
}

AccordionPanelTrigger.displayName = "AccordionPanelTrigger";

// ── Internal chevron ────────────────────────────────────────────────────

function ChevronIcon({
  orientation,
  purpose,
  className,
}: {
  orientation: "horizontal" | "vertical";
  /** "expand" → closed section, click to open. "collapse" → open section, click to close. */
  purpose: "expand" | "collapse";
  className?: string;
}) {
  // For horizontal: both states use a left-pointing chevron (matches the
  // screenshot convention — closed sections show ❮, open dividers reveal
  // a ❮ on hover indicating the section will collapse leftward).
  //
  // For vertical: closed shows down ⌄ (click to expand below); open
  // divider on hover shows up ⌃ (click to collapse upward).
  const transform =
    orientation === "horizontal"
      ? "rotate(180deg)"
      : purpose === "expand"
        ? "rotate(90deg)"
        : "rotate(270deg)";

  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform }}
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 4 10 8 6 12" />
    </svg>
  );
}
