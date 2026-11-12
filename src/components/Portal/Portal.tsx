import { createPortal } from "react-dom";
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Where a `<Portal>` without an explicit `container` renders. `null` means
 * `document.body`, which is what every Portal did before this existed.
 *
 * A full-screen surface provides its own element here while it is active. In the
 * browser's Fullscreen API only the full-screen element's subtree is painted, so
 * a menu, tooltip or dialog portalled to `<body>` from inside a full-screen
 * editor would open invisibly. Redirecting keeps every react-fancy overlay a
 * descendant of the surface without the components inside knowing.
 *
 * A host can provide it too, around the whole app, to portal every popup into
 * a landmark (`<main>`) rather than `<body>`.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export interface PortalProps {
  children: ReactNode;
  /**
   * The element to portal into, such as a landmark (`<main>`), so the popup is
   * inside it rather than loose in `<body>`. Wins over `container` and over a
   * `PortalContainerContext` provider. Default: `document.body`.
   */
  portalContainer?: HTMLElement | null;
  /** The same as `portalContainer`, under its original name. */
  container?: HTMLElement;
}

export function Portal({ children, container, portalContainer }: PortalProps) {
  // Render nothing on the server AND on the client's first (hydration) render,
  // then portal after mount. Without the `mounted` gate the client would render
  // the portal immediately while the server rendered null — a hydration
  // mismatch (the portal wrapper appears client-only). Deferring to after mount
  // keeps the first client render identical to the server. SSR-safe for every
  // Portal consumer (Toast, Modal, Dropdown, Tooltip, Popover, …).
  const [mounted, setMounted] = useState(false);
  const contextContainer = useContext(PortalContainerContext);
  useEffect(() => {
    setMounted(true);
  }, []);

  const dark = useRootDark(mounted);

  if (!mounted || typeof document === "undefined") return null;

  const target = portalContainer ?? container ?? contextContainer ?? document.body;

  return createPortal(<PortalRoot dark={dark}>{children}</PortalRoot>, target);
}

/**
 * Whether `<html>` is in dark mode (`class="dark"` or `data-theme="dark"`),
 * followed live. Tailwind's `dark:` variant then applies inside the portal
 * even when the app's variant is keyed on an ancestor the portal is not under.
 */
function useRootDark(enabled: boolean): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const sync = () =>
      setDark(root.classList.contains("dark") || root.getAttribute("data-theme") === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, [enabled]);

  return dark;
}

/**
 * The portalled content, carrying the `data-react-fancy-portal` handle and the
 * synced `dark` class.
 *
 * One host element (the usual case: a menu, listbox or dialog) carries them
 * itself, so the popup is the element in `<body>` and keeps its own role there.
 * A role-less wrapper around it is what axe's "region" rule reports as page
 * content outside every landmark; a `menu`, `listbox` or `dialog` it does not.
 * Anything else (several nodes, text, a component) keeps a
 * `display: contents` wrapper, as every Portal had before.
 */
function PortalRoot({ children, dark }: { children: ReactNode; dark: boolean }) {
  if (isValidElement(children) && typeof children.type === "string") {
    const element = children as ReactElement<{ className?: string }>;
    const own = element.props.className;
    return cloneElement(element, {
      "data-react-fancy-portal": "",
      className: dark ? (own ? `${own} dark` : "dark") : own,
    } as Record<string, unknown>);
  }

  return (
    <div data-react-fancy-portal="" className={dark ? "dark" : undefined} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
