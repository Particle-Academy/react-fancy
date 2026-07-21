import type { HTMLAttributes, ReactNode } from "react";

/** Which edge the drawer is anchored to, and therefore slides in from. */
export type DrawerSide = "left" | "right" | "top" | "bottom";

/**
 * How large the drawer is along its own axis.
 *
 * `size` controls WIDTH for `left`/`right` and HEIGHT for `top`/`bottom` — the
 * cross-axis always fills its anchor. One scale, two meanings, so `size="md"`
 * reads the same whichever edge you attach to.
 */
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "full";

/**
 * Where the drawer is anchored.
 *
 * - `viewport` (default) — portalled, `fixed`, covers the screen, locks body
 *   scroll and traps focus. The classic app-level drawer.
 * - `container` — `absolute` inside the nearest positioned ancestor, no portal,
 *   no scroll lock, no focus trap. Attach it to a Card, a layout region, or the
 *   shell around a prompt input and it stays inside that box.
 */
export type DrawerAttach = "viewport" | "container";

export interface DrawerContextValue {
  open: boolean;
  close: () => void;
  side: DrawerSide;
}

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  /** Edge to anchor to. Default `right`. */
  side?: DrawerSide;
  /** Extent along the drawer's own axis. Default `md`. */
  size?: DrawerSize;
  /** Viewport-level or scoped to a container. Default `viewport`. */
  attach?: DrawerAttach;
  /** Render the scrim behind the panel. Default `true`. */
  backdrop?: boolean;
  /** Clicking the scrim closes. Default `true`. */
  dismissOnBackdrop?: boolean;
  /** Escape closes. Default `true`. */
  dismissOnEscape?: boolean;
  className?: string;
}

export interface DrawerHeaderProps {
  children: ReactNode;
  /** Show the close button. Default `true`. */
  closable?: boolean;
  className?: string;
}

export interface DrawerBodyProps {
  children: ReactNode;
  className?: string;
}

export interface DrawerFooterProps {
  children: ReactNode;
  className?: string;
}

export interface DrawerContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}
