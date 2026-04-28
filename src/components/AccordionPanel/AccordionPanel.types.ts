import type { ReactNode } from "react";

export type AccordionOrientation = "horizontal" | "vertical";

/**
 * Render-prop or static node accepted by Trigger.children — lets the
 * caller branch rendering on the section state.
 */
export type SectionRenderable =
  | ReactNode
  | ((state: SectionRenderState) => ReactNode);

export interface SectionRenderState {
  /** Section's id */
  id: string;
  /** True when the section is currently open */
  open: boolean;
  /** Direction the panel is laid out in */
  orientation: AccordionOrientation;
  /** Toggle this section open/closed */
  toggle: () => void;
}

export interface AccordionPanelProps {
  /** Layout direction. Horizontal for menus/toolbars, vertical for sidebars/panels. */
  orientation?: AccordionOrientation;
  /** Controlled list of open section ids */
  value?: string[];
  /** Default open section ids (uncontrolled) */
  defaultValue?: string[];
  /** Fires whenever the open set changes */
  onValueChange?: (open: string[]) => void;
  /** Optional class on the root container */
  className?: string;
  children: ReactNode;
}

export interface AccordionPanelSectionProps {
  /** Stable id used for open-state tracking */
  id: string;
  /**
   * Pinned sections never collapse. Useful for an "anchor" item like a
   * Home button at the start of a menu.
   */
  pinned?: boolean;
  /** Class on the section's outer container */
  className?: string;
  /** Class applied only when the section is open */
  openClassName?: string;
  /** Class applied only when the section is collapsed */
  closedClassName?: string;
  /**
   * Skip the default flex layout (items-center + gap-1 + flex-row/col).
   * Use this for full-bleed panel sections that need their children
   * to stretch (e.g. a chat sidebar where the trigger should fill
   * full panel height). The data attributes, section context, and
   * conditional render of children stay in place.
   */
  unstyled?: boolean;
  /**
   * Children. Compose with `<AccordionPanel.Trigger>` and
   * `<AccordionPanel.Content>` — Trigger always renders, Content only
   * renders when the section is open.
   */
  children: ReactNode;
}

export interface AccordionPanelTriggerProps {
  /**
   * Custom render. Receives section state — `{ open, toggle, ... }`. If
   * omitted, the default chevron-divider is rendered.
   */
  children?: SectionRenderable;
  /** Class on the trigger element */
  className?: string;
  /** Aria label override (default: "Toggle section") */
  "aria-label"?: string;
}
