import { createContext, useContext, type ReactNode } from "react";
import { PortalContainerContext } from "../Portal/Portal";
import { EscapeLayerContext } from "../../hooks/use-escape-key";
import type { UseFullScreenResult } from "../../hooks/use-full-screen";

export const FullScreenContext = createContext<UseFullScreenResult | null>(null);

/** The nearest full-screen surface's state, or `null` outside one. */
export function useFullScreenContext(): UseFullScreenResult | null {
  return useContext(FullScreenContext);
}

export interface FullScreenProviderProps {
  /** What `useFullScreen()` returned for the surface. */
  value: UseFullScreenResult<HTMLElement> | UseFullScreenResult<HTMLDivElement>;
  children?: ReactNode;
}

/**
 * For a surface that owns its root and calls `useFullScreen()` itself (Editor,
 * DeckEditor, SheetWorkbook). Makes `<FullScreen.Toggle />` work anywhere inside
 * and redirects descendant `<Portal>`s into the surface while it is active.
 * It also marks everything inside as belonging to this surface for Escape, so
 * an open menu, listbox, popover or tooltip inside closes before the surface
 * exits. A surface that skips the provider loses that, as well as the portals.
 */
export function FullScreenProvider({ value, children }: FullScreenProviderProps) {
  return (
    <FullScreenContext.Provider value={value as UseFullScreenResult}>
      <EscapeLayerContext.Provider value={value.escapeScope}>
        <PortalContainerContext.Provider value={value.portalContainer}>{children}</PortalContainerContext.Provider>
      </EscapeLayerContext.Provider>
    </FullScreenContext.Provider>
  );
}
