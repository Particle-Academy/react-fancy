import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { useControllableState } from "./use-controllable-state";
import { lockBodyScroll } from "../utils/scroll-lock";

/**
 * How a surface goes full screen.
 *
 * - `"overlay"` (default): the element itself becomes `position: fixed` over the
 *   viewport, in place. It always works: inside an iframe without
 *   `allow="fullscreen"`, inside a dialog, without a user gesture. Nothing is
 *   reparented, so an editor keeps its caret, undo stack and DOM.
 * - `"native"`: the browser Fullscreen API (`element.requestFullscreen()`),
 *   which hides the browser chrome too. The overlay is applied first and stays
 *   if the request is rejected or the API is missing, so the user gets full
 *   screen either way; `activeMode` reports which one took.
 */
export type FullScreenMode = "overlay" | "native";

export interface UseFullScreenOptions {
  /** Controlled flag. Pair with `onFullScreenChange`. */
  fullScreen?: boolean;
  /** Initial flag when uncontrolled. @default false */
  defaultFullScreen?: boolean;
  /**
   * Fired with the requested state — from the toggle, Escape, an agent calling
   * `setFullScreen`, or the user leaving the browser's own full screen.
   */
  onFullScreenChange?: (fullScreen: boolean) => void;
  /** @default "overlay" */
  mode?: FullScreenMode;
  /** Leave full screen on Escape. @default true */
  closeOnEscape?: boolean;
  /** Stop the page behind from scrolling while active. @default true */
  lockScroll?: boolean;
  /** Stacking order of the overlay. Matches `Modal`. @default 50 */
  zIndex?: number;
  /** Accessible names for the toggle. */
  labels?: { enter?: string; exit?: string };
}

export interface FullScreenTargetProps<T extends HTMLElement> {
  ref: RefObject<T | null>;
  "data-fullscreen": "true" | "false";
  "data-fullscreen-mode"?: FullScreenMode;
  "data-fullscreen-layer"?: FullScreenLayer;
  style?: CSSProperties;
  onKeyDown: (event: ReactKeyboardEvent<T>) => void;
}

export interface FullScreenToggleProps {
  type: "button";
  onClick: () => void;
  "aria-pressed": boolean;
  "aria-label": string;
  title: string;
  "data-react-fancy-fullscreen-toggle": "";
  "data-fullscreen": "true" | "false";
}

export interface UseFullScreenResult<T extends HTMLElement = HTMLElement> {
  fullScreen: boolean;
  setFullScreen: (fullScreen: boolean) => void;
  toggle: () => void;
  /** The mechanism in effect while active; `null` when not full screen. */
  activeMode: FullScreenMode | null;
  /**
   * `"top"` while the surface is in the browser's top layer (a manual popover,
   * or the native full screen), `"fixed"` while it relies on `position: fixed`
   * (no popover API, or the browser refused). `null` when not full screen.
   */
  layer: FullScreenLayer | null;
  /** Attach to the element that goes full screen. Also inside `targetProps`. */
  ref: RefObject<T | null>;
  /**
   * Spread onto the surface's root. Carries the ref, the `data-fullscreen`
   * handle, the overlay style and the Escape/Tab handler. Merge your own
   * `style` / `onKeyDown` if the root has them.
   */
  targetProps: FullScreenTargetProps<T>;
  /** Spread onto a `<button>` to make it the toggle. */
  toggleProps: FullScreenToggleProps;
  /**
   * The element to portal into while active, else `null`. Provide it through
   * `PortalContainerContext` so menus opened inside stay visible.
   */
  portalContainer: HTMLElement | null;
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/** Active surfaces, innermost last. Only the top one answers a stray Escape. */
const activeStack: object[] = [];

const OVERLAY_STYLE: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: "100%",
  height: "100%",
  maxWidth: "none",
  maxHeight: "none",
  margin: 0,
  borderRadius: 0,
  boxSizing: "border-box",
};

/**
 * Lift `el` into the browser's top layer with `popover="manual"`.
 *
 * Why: `position: fixed` is only fixed to the viewport while no ancestor has a
 * transform, filter, perspective or paint containment. With one, the overlay
 * is fixed to THAT box. In the showcase a surface in a Tabs panel came out
 * 1248x95, because `.fancy-fade-in` held `transform: matrix(1,0,0,1,0,0)` via
 * `animation-fill-mode: both`. Transform-centred dialogs do the same. A
 * top-layer element's containing block is the viewport whatever its ancestors
 * do, and the popover API gets it there without moving it in the DOM.
 *
 * `manual` because `auto` light-dismisses on an outside click and on Escape;
 * Escape stays with the surface's own handler.
 *
 * Returns a release function, or `null` where the API is missing or refuses
 * (the caller keeps the fixed overlay). `onLost` fires if something else
 * closes the popover: a `[popover]` that is not open is `display: none`, so the
 * attribute must go at once or the surface vanishes while still "full screen".
 */
/** Surfaces currently in the top layer through a popover, with a "re-show" each. */
const promoted = new Map<HTMLElement, () => void>();

function promoteToTopLayer(el: HTMLElement, onLost: () => void): (() => void) | null {
  const p = el as HTMLElement & { showPopover?: () => void; hidePopover?: () => void };
  if (typeof p.showPopover !== "function" || typeof p.hidePopover !== "function") return null;
  // The consumer made it a popover themselves; do not fight over it.
  if (el.hasAttribute("popover")) return null;

  el.setAttribute("popover", "manual");
  try {
    p.showPopover();
  } catch {
    el.removeAttribute("popover");
    return null;
  }

  let open = true;
  let raising = false;
  const onToggle = (e: Event) => {
    if (raising || (e as Event & { newState?: string }).newState !== "closed" || !open) return;
    open = false;
    promoted.delete(el);
    el.removeEventListener("toggle", onToggle);
    el.removeAttribute("popover");
    onLost();
  };
  el.addEventListener("toggle", onToggle);

  // The top layer stacks in SHOW order. React runs a child's layout effects
  // before its parent's, so a surface nested in another that goes full screen
  // in the same commit is shown first and then buried by its parent. Re-show
  // any promoted descendant so the innermost stays on top.
  for (const [other, raise] of promoted) {
    if (other !== el && el.contains(other)) raise();
  }
  promoted.set(el, () => {
    raising = true;
    try {
      p.hidePopover!();
      p.showPopover!();
    } catch {
      /* leave it where it is */
    } finally {
      raising = false;
    }
  });

  return () => {
    promoted.delete(el);
    el.removeEventListener("toggle", onToggle);
    if (open) {
      open = false;
      try {
        p.hidePopover!();
      } catch {
        /* already hidden, e.g. removed from the document */
      }
    }
    el.removeAttribute("popover");
  };
}

/** Which mechanism keeps the surface over the page. */
export type FullScreenLayer = "top" | "fixed";

interface ScrollMemo {
  el: Element;
  top: number;
  left: number;
}

/**
 * A controlled full-screen state for any surface: Editor today, DeckEditor and
 * SheetWorkbook next. Render-time output is pure (no `window`/`document`), so it
 * server-renders; everything that touches the DOM runs in effects.
 */
export function useFullScreen<T extends HTMLElement = HTMLElement>(
  options: UseFullScreenOptions = {},
): UseFullScreenResult<T> {
  const {
    fullScreen: controlled,
    defaultFullScreen = false,
    onFullScreenChange,
    mode = "overlay",
    closeOnEscape = true,
    lockScroll = true,
    zIndex = 50,
    labels,
  } = options;

  const [fullScreen, setState] = useControllableState(controlled, defaultFullScreen, onFullScreenChange);
  const ref = useRef<T | null>(null);
  const token = useRef({});
  const [nativeActive, setNativeActive] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  // Whether the overlay STYLE is on. It trails `fullScreen` by one synchronous
  // commit on entry, so the layout effect below reads scroll offsets while the
  // surface is still in flow. Read after the style lands and the browser has
  // already clamped every scroll container around it: a panel at 569 read as
  // 342 in Chromium, and that is where the user was sent back to. The re-render
  // happens inside the layout phase, before paint, so nothing flashes.
  // Initialised from `fullScreen` so a surface that starts full screen renders
  // the overlay on the server and on hydration alike.
  const [applied, setApplied] = useState(fullScreen);
  // "fixed" until a layout effect has actually promoted the surface, so the
  // server and the hydrating client agree, and a refused promotion reads true.
  const [layer, setLayer] = useState<FullScreenLayer>("fixed");
  const topRelease = useRef<(() => void) | null>(null);

  const promote = (el: HTMLElement) => {
    if (topRelease.current) return;
    topRelease.current = promoteToTopLayer(el, () => {
      topRelease.current = null;
      setLayer("fixed");
    });
    setLayer(topRelease.current ? "top" : "fixed");
  };
  const demote = () => {
    topRelease.current?.();
    topRelease.current = null;
  };

  const current = useRef(fullScreen);
  current.current = fullScreen;

  // Only report real transitions: Escape on an inactive surface, or a second
  // click racing a re-render, must not fire `onFullScreenChange(false)` twice.
  const setFullScreen = useCallback(
    (next: boolean) => {
      if (current.current === next) return;
      current.current = next;
      setState(next);
    },
    [setState],
  );
  const toggle = useCallback(() => setFullScreen(!current.current), [setFullScreen]);

  // Enter / exit bookkeeping. A LAYOUT effect so the cleanup runs after the
  // overlay style has been removed from the DOM but before paint: scroll offsets
  // restored there never flash, and the surface is back in flow to measure.
  useLayoutEffect(() => {
    if (!fullScreen) return;
    const el = ref.current;
    if (!el) return;

    // Taking the surface out of flow shrinks every scroll container around it,
    // which clamps their scrollTop. Remember them so exit lands where it began.
    const scrolled: ScrollMemo[] = [];
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      if (p.scrollTop || p.scrollLeft) scrolled.push({ el: p, top: p.scrollTop, left: p.scrollLeft });
    }
    const winX = window.scrollX;
    const winY = window.scrollY;

    const release = lockScroll ? lockBodyScroll() : null;
    activeStack.push(token.current);
    setPortalContainer(el);
    setApplied(true);

    // Native mode asks the browser first: Chromium rejects requestFullscreen()
    // on an element that is already an open popover ("already open as a
    // Popover, and therefore cannot be opened via the fullscreen API"). The
    // native effect promotes on refusal instead.
    const native = mode === "native" && typeof el.requestFullscreen === "function" && document.fullscreenEnabled !== false;
    if (!native) promote(el);

    return () => {
      const i = activeStack.indexOf(token.current);
      if (i >= 0) activeStack.splice(i, 1);
      // Out of the top layer first, so the surface is back in flow before the
      // scroll offsets are put back.
      demote();
      setLayer("fixed");
      release?.();
      for (const m of scrolled) {
        if (m.el.scrollTop !== m.top) m.el.scrollTop = m.top;
        if (m.el.scrollLeft !== m.left) m.el.scrollLeft = m.left;
      }
      if (window.scrollX !== winX || window.scrollY !== winY) window.scrollTo(winX, winY);
      setPortalContainer(null);
      setApplied(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullScreen, lockScroll, mode]);

  // Focus in and back out. A PASSIVE effect on purpose: React re-focuses
  // whatever had focus before a commit once the commit's mutations finish, so a
  // focus() issued from a layout-effect cleanup is silently undone.
  useEffect(() => {
    if (!fullScreen) return;
    const el = ref.current;
    if (!el) return;

    const opener =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : null;

    // Focus must not stay behind the overlay, where the user cannot see it.
    if (!el.contains(document.activeElement)) {
      el.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    }

    return () => {
      // Give focus back only if it is still ours to give: inside the surface,
      // or lost to <body>. A user who clicked elsewhere keeps their choice.
      const active = document.activeElement;
      if (opener?.isConnected && (!active || active === document.body || el.contains(active))) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [fullScreen]);

  // The browser Fullscreen API, on top of the overlay.
  useEffect(() => {
    if (!fullScreen || mode !== "native") return;
    const el = ref.current;
    if (!el || typeof el.requestFullscreen !== "function" || document.fullscreenEnabled === false) return;

    let cancelled = false;
    let entered = false;

    const onChange = () => {
      if (document.fullscreenElement === el) {
        entered = true;
        setNativeActive(true);
        // The browser's full screen is the top layer too.
        setLayer("top");
      } else if (entered) {
        // The user left through the browser's own UI (Esc, F11, the close
        // pill). Keep the controlled state honest rather than leaving an
        // overlay up that they believe they dismissed.
        entered = false;
        setNativeActive(false);
        setLayer("fixed");
        if (!cancelled) setFullScreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);

    // Blocked requests (iframe without allow="fullscreen", no user gesture, a
    // permissions policy) reject, and some engines throw instead. Either way
    // the user stays full screen in the overlay, lifted into the top layer.
    const refused = () => {
      if (!cancelled && current.current && ref.current === el) promote(el);
    };
    try {
      Promise.resolve(el.requestFullscreen()).then(onChange, refused);
    } catch {
      refused();
    }

    return () => {
      cancelled = true;
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement === el) {
        try {
          Promise.resolve(document.exitFullscreen()).catch(() => {});
        } catch {
          /* already left */
        }
      }
      setNativeActive(false);
    };
  }, [fullScreen, mode, setFullScreen]);

  // Escape with nothing focused never reaches the surface's own handler.
  useEffect(() => {
    if (!fullScreen || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target;
      if (t !== document.body && t !== document.documentElement && t !== document) return;
      if (activeStack[activeStack.length - 1] !== token.current) return;
      setFullScreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullScreen, closeOnEscape, setFullScreen]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<T>) => {
      if (!current.current || e.defaultPrevented) return;
      const el = ref.current;
      if (!el) return;

      if (e.key === "Tab") {
        // Keep Tab inside the surface; what is behind the overlay is invisible.
        const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === el)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (e.key !== "Escape" || !closeOnEscape) return;
      // An Escape from inside a layer opened FROM this surface (a menu, a
      // popover, a dialog) belongs to that layer. React bubbles portal events
      // through the component tree, so check the DOM: a portal wrapper that
      // does not contain this surface is nested inside it.
      const layer = (e.target as Element).closest?.("[data-react-fancy-portal]");
      if (layer && !layer.contains(el)) return;
      // Stop it here so an enclosing dialog's document listener does not also
      // close: one Escape, one step back.
      e.preventDefault();
      e.stopPropagation();
      setFullScreen(false);
    },
    [closeOnEscape, setFullScreen],
  );

  const activeMode: FullScreenMode | null = fullScreen ? (nativeActive ? "native" : "overlay") : null;
  const enterLabel = labels?.enter ?? "Enter full screen";
  const exitLabel = labels?.exit ?? "Exit full screen";

  return {
    fullScreen,
    setFullScreen,
    toggle,
    activeMode,
    layer: activeMode ? layer : null,
    ref,
    portalContainer,
    targetProps: {
      ref,
      "data-fullscreen": fullScreen ? "true" : "false",
      ...(activeMode ? { "data-fullscreen-mode": activeMode, "data-fullscreen-layer": layer } : {}),
      ...(fullScreen && applied ? { style: { ...OVERLAY_STYLE, zIndex } } : {}),
      onKeyDown,
    },
    toggleProps: {
      type: "button",
      onClick: toggle,
      "aria-pressed": fullScreen,
      "aria-label": fullScreen ? exitLabel : enterLabel,
      title: fullScreen ? exitLabel : enterLabel,
      "data-react-fancy-fullscreen-toggle": "",
      "data-fullscreen": fullScreen ? "true" : "false",
    },
  };
}
