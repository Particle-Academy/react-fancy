import type { HTMLAttributes, ReactNode } from "react";

/**
 * Which edge the drawer is anchored to, and therefore slides in from.
 *
 * `start` / `end` are the inline edges and follow the writing direction: `end`
 * is the right in LTR and the left in RTL. `left` / `right` are physical and
 * stay put in RTL — use them only when the side really is a screen side.
 */
export type DrawerSide = "start" | "end" | "left" | "right" | "top" | "bottom";

/**
 * How large the drawer is along its own axis.
 *
 * `size` controls WIDTH for the side edges and HEIGHT for `top`/`bottom` — the
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
  /** The id `Drawer.Header` gives its title, which names the dialog. */
  titleId: string;
  /** Called by `Drawer.Header` while it is mounted; returns the unregister. */
  registerTitle: () => () => void;
}

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  /** Edge to anchor to. Default `end`: the right in LTR, the left in RTL. */
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
  /**
   * Keep the children mounted while closed. Default `false`: the drawer
   * unmounts its children on close.
   *
   * When `true`, a closed drawer stays in the tree `hidden`, `inert` and
   * `aria-hidden`, so its contents are not painted, focusable or announced, but
   * keep their state and DOM identity: an `<audio>` element keeps playing, a
   * form keeps what was typed. Focus trap, scroll lock and Escape still apply
   * only while open. The children mount on the first render even if the drawer
   * starts closed.
   */
  keepMounted?: boolean;
  className?: string;
}

export interface DrawerHeaderProps {
  children: ReactNode;
  /** Show the close button. Default `true`. */
  closable?: boolean;
  className?: string;
  /** Accessible name of the close button. Default `"Close"`; pass your locale's word. */
  closeLabel?: string;
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
