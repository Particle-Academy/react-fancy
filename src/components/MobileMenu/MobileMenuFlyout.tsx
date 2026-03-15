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
  side = "left",
  title,
  className,
}: MobileMenuFlyoutProps) {
  const isLeft = side === "left";

  const { mounted, className: animClass, ref } = useAnimation({
    open,
    enterClass: isLeft ? "fancy-slide-in-left" : "fancy-slide-in-right",
    exitClass: isLeft ? "fancy-slide-out-left" : "fancy-slide-out-right",
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
              "absolute top-0 flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-xl dark:bg-zinc-900",
              isLeft ? "left-0" : "right-0",
              animClass,
              className,
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              {title && (
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {title}
                </span>
              )}
              {!title && <span />}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
