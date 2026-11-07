import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useEscapeKey } from "../../hooks";
import { useAnimation } from "../../hooks";
import { Portal } from "../Portal";
import { MobileMenuContext } from "./MobileMenu.context";
import type { MobileMenuFlyoutProps } from "./MobileMenu.types";

export function MobileMenuFlyout({
  children,
  open,
  onClose,
  side = "start",
  title,
  className,
}: MobileMenuFlyoutProps) {
  // `start` / `end` resolve against the writing direction in CSS, so the
  // same markup is right for both and nothing is measured.
  const edge = {
    start: { pos: "start-0", enter: "fancy-slide-in-start", exit: "fancy-slide-out-start" },
    end: { pos: "end-0", enter: "fancy-slide-in-end", exit: "fancy-slide-out-end" },
    left: { pos: "left-0", enter: "fancy-slide-in-left", exit: "fancy-slide-out-left" },
    right: { pos: "right-0", enter: "fancy-slide-in-right", exit: "fancy-slide-out-right" },
  }[side];

  const { mounted, className: animClass, ref } = useAnimation({
    open,
    enterClass: edge.enter,
    exitClass: edge.exit,
  });

  useEscapeKey(onClose, open);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <Portal>
      <MobileMenuContext.Provider value={{ variant: "flyout" }}>
        <div data-react-fancy-mobile-menu-flyout="" className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className={cn(
              "absolute inset-0 bg-black/40 transition-opacity",
              open ? "opacity-100" : "opacity-0",
            )}
            onClick={onClose}
          />

          {/* Panel */}
          <div
            ref={ref as React.RefObject<HTMLDivElement>}
            className={cn(
              "absolute top-0 flex h-full w-72 max-w-[80vw] flex-col bg-[color:var(--fancy-surface,var(--color-white))] shadow-xl dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
              edge.pos,
              animClass,
              className,
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--fancy-border,var(--color-zinc-200))] px-4 py-3 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]">
              {title && (
                <span className="text-sm font-semibold text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]">
                  {title}
                </span>
              )}
              {!title && <span />}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))] transition-colors hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] hover:text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:hover:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))] dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {children}
            </div>
          </div>
        </div>
      </MobileMenuContext.Provider>
    </Portal>
  );
}

MobileMenuFlyout.displayName = "MobileMenuFlyout";
