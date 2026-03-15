import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode } from "react";

export interface PortalProps {
  children: ReactNode;
  container?: HTMLElement;
}

export function Portal({ children, container }: PortalProps) {
  if (typeof document === "undefined") return null;

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
