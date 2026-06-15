import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface PortalProps {
  children: ReactNode;
  container?: HTMLElement;
}

export function Portal({ children, container }: PortalProps) {
  // Render nothing on the server AND on the client's first (hydration) render,
  // then portal after mount. Without the `mounted` gate the client would render
  // the portal immediately while the server rendered null — a hydration
  // mismatch (the portal wrapper appears client-only). Deferring to after mount
  // keeps the first client render identical to the server. SSR-safe for every
  // Portal consumer (Toast, Modal, Dropdown, Tooltip, Popover, …).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const target = container ?? document.body;

  return createPortal(
    <PortalDarkWrapper>{children}</PortalDarkWrapper>,
    target,
  );
}

/**
 * Wrapper that propagates the `dark` class from <html> into the portal subtree.
 * This ensures Tailwind `dark:` utilities work even though Portal renders
 * outside the React component tree.
 */
function PortalDarkWrapper({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const wrapper = ref.current;
    if (!wrapper) return;

    const sync = () => {
      const isDark =
        root.classList.contains("dark") ||
        root.getAttribute("data-theme") === "dark";
      wrapper.classList.toggle("dark", isDark);
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-react-fancy-portal="" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
