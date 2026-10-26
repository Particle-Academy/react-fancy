import { createContext, useContext, useEffect, useRef } from "react";

/**
 * Escape belongs to the innermost open layer.
 *
 * Every `useEscapeKey(handler, enabled)` call is a LAYER while `enabled`: a
 * Dropdown's menu, a Select's listbox, a Popover, a Modal, a Drawer, a Tooltip,
 * a full-screen surface. They all join one stack, one document listener reads
 * each Escape, and only one layer gets it.
 *
 * Why not one document listener per layer, as this hook used to do: every
 * open layer then received the same Escape. A Dropdown inside a Modal closed
 * the menu AND the dialog. Inside a full-screen surface it was worse: the
 * surface's own key handler runs during the event's trip through the surface,
 * before any document listener, so it could not tell that a menu wanted the
 * key. DeckEditor exited full screen with its Shape menu still open. Fixing
 * that by ordering listeners would only last until someone registers one in a
 * different place. So the decision is made from the stack instead.
 *
 * "Innermost" is decided in two steps:
 *
 * 1. The most recently opened layer is the candidate. Opening a menu from a
 *    dialog is the normal order of things.
 * 2. A full-screen surface knows its own descendants: layers rendered inside
 *    it register under it through `EscapeLayerContext`, and that context flows
 *    through portals. If the candidate is a surface with open layers inside,
 *    the most recent of those wins instead. Without this step, a menu opened
 *    BEFORE an agent put its surface full screen would lose the Escape to the
 *    surface.
 *
 * An Escape that something already handled (`event.defaultPrevented`, for
 * example a text field clearing itself) is left alone.
 */

interface LayerEntry {
  handler: { current: () => void };
  /** The surface this layer was rendered inside, if any. */
  parent: EscapeScope | null;
  /** Set when the layer IS a surface: layers inside it point here. */
  scope: EscapeScope | null;
}

/** Identity of a full-screen surface for the layers rendered inside it. */
export type EscapeScope = object;

const stack: LayerEntry[] = [];

/** The surface (if any) that layers rendered here belong to. */
export const EscapeLayerContext = createContext<EscapeScope | null>(null);

function innermost(): LayerEntry | undefined {
  let candidate = stack[stack.length - 1];
  while (candidate?.scope) {
    const scope = candidate.scope;
    let inner: LayerEntry | undefined;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].parent === scope) {
        inner = stack[i];
        break;
      }
    }
    if (!inner) break;
    candidate = inner;
  }
  return candidate;
}

function onDocumentKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const target = innermost();
  if (!target) return;
  event.preventDefault();
  target.handler.current();
}

function push(entry: LayerEntry): () => void {
  if (stack.length === 0) document.addEventListener("keydown", onDocumentKeyDown);
  stack.push(entry);
  return () => {
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    if (stack.length === 0) document.removeEventListener("keydown", onDocumentKeyDown);
  };
}

/**
 * Register a layer that closes on Escape while `enabled`. Pass `scope` only for
 * a surface that other layers can open inside (a full-screen surface).
 *
 * Returns `isInnermost()`, for a layer that also handles Escape in its own key
 * handler and must not act when a layer above it owns the key.
 *
 * @internal Exported for full-screen surfaces in sibling packages; ordinary
 * layers call `useEscapeKey`.
 */
export function useEscapeLayer(
  handler: () => void,
  enabled: boolean,
  scope: EscapeScope | null = null,
): { isInnermost: () => boolean } {
  const parent = useContext(EscapeLayerContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const entryRef = useRef<LayerEntry | null>(null);

  // Depends on `enabled` (and identity), NOT on `handler`: callers pass inline
  // callbacks, and re-registering on every render would move a dialog above
  // the menu it had just opened.
  useEffect(() => {
    if (!enabled) return;
    const entry: LayerEntry = { handler: handlerRef, parent, scope };
    entryRef.current = entry;
    const pop = push(entry);
    return () => {
      pop();
      if (entryRef.current === entry) entryRef.current = null;
    };
  }, [enabled, parent, scope]);

  const isInnermostRef = useRef(() => entryRef.current !== null && innermost() === entryRef.current);
  return { isInnermost: isInnermostRef.current };
}

export function useEscapeKey(handler: () => void, enabled: boolean = true): void {
  useEscapeLayer(handler, enabled);
}
